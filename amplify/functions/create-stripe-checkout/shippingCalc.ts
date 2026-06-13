import type Stripe from "stripe";
import type { Schema } from "../../data/resource";

export type CheckoutLineItem = {
  productId: string;
  slug: string;
  variantId?: string;
  quantity: number;
  title: string;
  priceCents: number;
  imageUrl?: string;
};

export function lineItemsFromArgs(
  items: (Schema["CheckoutCartLine"]["type"] | null | undefined)[],
): CheckoutLineItem[] {
  return items
    .filter((item): item is Schema["CheckoutCartLine"]["type"] => item != null)
    .map((item) => ({
      productId: item.productId,
      slug: item.slug,
      variantId: item.variantId ?? undefined,
      quantity: item.quantity,
      title: item.title,
      priceCents: item.priceCents,
      imageUrl: item.imageUrl ?? undefined,
    }));
}

type ShippingProfileRecord = Schema["ShippingProfile"]["type"];
type ProductRecord = Schema["Product"]["type"];

export type WeightTier = {
  maxWeightOz: number;
  amountCents: number;
};

export function parseWeightTiers(raw: unknown): WeightTier[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((tier) => ({
        maxWeightOz: Number(tier?.maxWeightOz),
        amountCents: Number(tier?.amountCents),
      }))
      .filter(
        (tier) =>
          Number.isFinite(tier.maxWeightOz) &&
          tier.maxWeightOz > 0 &&
          Number.isFinite(tier.amountCents) &&
          tier.amountCents >= 0,
      )
      .sort((a, b) => a.maxWeightOz - b.maxWeightOz);
  } catch {
    return [];
  }
}

function shippingCentsForWeight(
  tiers: WeightTier[],
  totalWeightOz: number,
): number {
  if (!tiers.length) return 0;
  const weight = Math.max(totalWeightOz, 0);
  for (const tier of tiers) {
    if (weight <= tier.maxWeightOz) return tier.amountCents;
  }
  return tiers[tiers.length - 1]?.amountCents ?? 0;
}

export function computeProfileShippingCents(
  profile: ShippingProfileRecord,
  context: {
    orderSubtotalCents: number;
    groupWeightOz: number;
    groupQuantity: number;
  },
): number {
  const firstItemCents = profile.amountCents ?? 0;
  const additionalItemCents = profile.additionalItemCents ?? 0;
  const byQuantityCents =
    firstItemCents +
    Math.max(0, context.groupQuantity - 1) * additionalItemCents;

  if (profile.kind === "free_over_threshold") {
    if (
      profile.freeThresholdCents != null &&
      context.orderSubtotalCents >= profile.freeThresholdCents
    ) {
      return 0;
    }
    return byQuantityCents;
  }

  if (profile.kind === "weight_tier") {
    return shippingCentsForWeight(
      parseWeightTiers(profile.weightTiers),
      context.groupWeightOz,
    );
  }

  return byQuantityCents;
}

function computeAdditionalOnlyCents(
  profile: ShippingProfileRecord,
  context: {
    orderSubtotalCents: number;
    groupQuantity: number;
  },
): number {
  if (
    profile.kind === "free_over_threshold" &&
    profile.freeThresholdCents != null &&
    context.orderSubtotalCents >= profile.freeThresholdCents
  ) {
    return 0;
  }
  return (profile.additionalItemCents ?? 0) * context.groupQuantity;
}

export function resolveCartShipping(
  lineItems: CheckoutLineItem[],
  productById: Map<string, ProductRecord>,
  profileById: Map<string, ShippingProfileRecord>,
  defaultProfile: ShippingProfileRecord | null,
): {
  totalShippingCents: number;
  profileIds: string[];
  allowedCountries: string[];
  displayName: string;
} {
  if (!lineItems.length) {
    throw new Error("Cart is empty");
  }

  const orderSubtotalCents = lineItems.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );

  const groups = new Map<
    string,
    { profile: ShippingProfileRecord; lines: CheckoutLineItem[] }
  >();

  for (const line of lineItems) {
    const product = productById.get(line.productId);
    if (!product) {
      throw new Error(`Product not found for checkout line: ${line.title}`);
    }

    const profileId = product.shippingProfileId ?? defaultProfile?.id;
    if (!profileId) {
      throw new Error(
        `No shipping profile for "${line.title}". Assign a profile on the product or create one in Admin → Shipping.`,
      );
    }

    const profile = profileById.get(profileId);
    if (!profile || !profile.active) {
      throw new Error(
        `Shipping profile is missing or inactive for "${line.title}".`,
      );
    }

    const existing = groups.get(profileId);
    if (existing) {
      existing.lines.push(line);
    } else {
      groups.set(profileId, { profile, lines: [line] });
    }
  }

  let nonCombinedShippingCents = 0;
  const combinedCandidates: {
    groupTotalCents: number;
    firstItemCents: number;
    additionalOnlyCents: number;
    quantity: number;
  }[] = [];
  const profileIds: string[] = [];
  const countrySet = new Set<string>();

  for (const { profile, lines } of groups.values()) {
    profileIds.push(profile.id);
    for (const code of profile.allowedCountries ?? []) {
      if (code) countrySet.add(code.toUpperCase());
    }

    const groupQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    const groupWeightOz = lines.reduce((sum, line) => {
      const product = productById.get(line.productId);
      const weightOz = product?.weightOz ?? 0;
      return sum + weightOz * line.quantity;
    }, 0);

    if (profile.kind === "weight_tier" && groupWeightOz <= 0) {
      throw new Error(
        `Profile "${profile.name}" uses weight tiers but "${lines[0]?.title ?? "item"}" has no weight (oz). Set weight on the product.`,
      );
    }

    const groupTotalCents = computeProfileShippingCents(profile, {
      orderSubtotalCents,
      groupWeightOz,
      groupQuantity,
    });

    if (profile.kind === "weight_tier") {
      nonCombinedShippingCents += groupTotalCents;
      continue;
    }

    combinedCandidates.push({
      groupTotalCents,
      firstItemCents: profile.amountCents ?? 0,
      additionalOnlyCents: computeAdditionalOnlyCents(profile, {
        orderSubtotalCents,
        groupQuantity,
      }),
      quantity: groupQuantity,
    });
  }

  // Etsy-like combine: keep one highest "first item" charge, use additional-item
  // charges for all remaining items across combined (non-weight-tier) groups.
  let combinedShippingCents = 0;
  if (combinedCandidates.length === 1) {
    combinedShippingCents = combinedCandidates[0]!.groupTotalCents;
  } else if (combinedCandidates.length > 1) {
    const pivot = combinedCandidates.reduce((best, row) =>
      row.firstItemCents > best.firstItemCents ? row : best,
    );
    combinedShippingCents =
      pivot.groupTotalCents +
      combinedCandidates
        .filter((row) => row !== pivot)
        .reduce((sum, row) => sum + row.additionalOnlyCents, 0);
  }

  if (countrySet.size === 0) countrySet.add("US");

  const profiles = [...groups.values()].map((g) => g.profile);
  const displayName =
    profiles.length === 1 ? profiles[0]!.name : "Shipping";

  return {
    totalShippingCents: nonCombinedShippingCents + combinedShippingCents,
    profileIds,
    allowedCountries: [...countrySet],
    displayName,
  };
}

export function buildStripeShippingOptions(
  resolved: ReturnType<typeof resolveCartShipping>,
): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: {
          amount: resolved.totalShippingCents,
          currency: "usd",
        },
        display_name: resolved.displayName,
        metadata: {
          shippingProfileIds: resolved.profileIds.join(","),
        },
      },
    },
  ];
}
