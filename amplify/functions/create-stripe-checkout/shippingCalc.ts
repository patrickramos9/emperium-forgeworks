import type Stripe from "stripe";
import type { Schema } from "../../data/resource";

/** Stripe Tax — shipping fees (`shipping_rate_data`). */
const STRIPE_SHIPPING_TAX_CODE = "txcd_92010001";

export type CheckoutLineItem = {
  productId: string;
  slug: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  title: string;
  priceCents: number;
  imageUrl?: string;
  printServiceJson?: string;
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
      variantLabel: item.variantLabel?.trim() || undefined,
      quantity: item.quantity,
      title: item.title,
      priceCents: item.priceCents,
      imageUrl: item.imageUrl ?? undefined,
      printServiceJson: item.printServiceJson ?? undefined,
    }));
}

type ShippingProfileRecord = Schema["ShippingProfile"]["type"];
type ProductRecord = Schema["Product"]["type"];

export type WeightTier = {
  maxWeightOz: number;
  amountCents: number;
};

type ShippingProfileKind =
  | "flat"
  | "free_over_threshold"
  | "weight_tier"
  | "free_shipping";

type InternationalShippingRate = {
  kind: ShippingProfileKind;
  amountCents: number;
  additionalItemCents: number;
  freeThresholdCents?: number;
  weightTiers?: WeightTier[];
  countriesMode: "all" | "list";
  countries?: string[];
};

const US_SHIPPING_COUNTRY = "US";

const ALL_INTERNATIONAL_COUNTRY_CODES = [
  "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AT", "AU",
  "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL",
  "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CD",
  "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CV", "CW", "CY",
  "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES",
  "ET", "FI", "FJ", "FK", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH",
  "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IS", "IT",
  "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KR", "KW", "KY",
  "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA",
  "MC", "MD", "ME", "MF", "MG", "MK", "ML", "MM", "MN", "MO", "MQ", "MR", "MS",
  "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NG", "NI", "NL",
  "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL",
  "PM", "PN", "PR", "PS", "PT", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA",
  "SB", "SC", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR",
  "SS", "ST", "SV", "SX", "SZ", "TA", "TC", "TD", "TF", "TG", "TH", "TJ", "TK",
  "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM",
  "ZW",
];

type RateConfig = {
  kind: ShippingProfileKind;
  amountCents: number;
  additionalItemCents: number;
  freeThresholdCents?: number | null;
  weightTiers?: unknown;
};

type ProfileGroup = {
  profile: ShippingProfileRecord;
  lines: CheckoutLineItem[];
};

export type ResolvedShippingOption = {
  displayName: string;
  amountCents: number;
  optionKey: string;
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

function normalizeKind(raw: unknown): ShippingProfileKind | null {
  if (
    raw === "flat" ||
    raw === "free_over_threshold" ||
    raw === "weight_tier" ||
    raw === "free_shipping"
  ) {
    return raw;
  }
  return null;
}

function parseCountryCodes(input: string): string[] {
  return input
    .split(/[,;\s]+/)
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));
}

export function parseInternationalRates(
  raw: unknown,
): InternationalShippingRate[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];

    const results: InternationalShippingRate[] = [];
    for (const row of parsed) {
      const kind = normalizeKind(row?.kind);
      if (!kind) continue;

      const rate: InternationalShippingRate = {
        kind,
        amountCents: Number(row?.amountCents) || 0,
        additionalItemCents: Number(row?.additionalItemCents) || 0,
        weightTiers: parseWeightTiers(row?.weightTiers),
        countriesMode:
          row?.countriesMode === "list" ? ("list" as const) : ("all" as const),
        countries: Array.isArray(row?.countries)
          ? row.countries
              .map((code: unknown) => String(code).trim().toUpperCase())
              .filter((code: string) => /^[A-Z]{2}$/.test(code))
          : parseCountryCodes(String(row?.countries ?? "")),
      };

      if (row?.freeThresholdCents != null) {
        rate.freeThresholdCents = Number(row.freeThresholdCents);
      }

      results.push(rate);
    }

    return results;
  } catch {
    return [];
  }
}

function profileToUsRateConfig(profile: ShippingProfileRecord): RateConfig {
  return {
    kind: normalizeKind(profile.kind) ?? "flat",
    amountCents: profile.amountCents ?? 0,
    additionalItemCents: profile.additionalItemCents ?? 0,
    freeThresholdCents: profile.freeThresholdCents,
    weightTiers: profile.weightTiers,
  };
}

function internationalRateToConfig(rate: InternationalShippingRate): RateConfig {
  return {
    kind: rate.kind,
    amountCents: rate.amountCents,
    additionalItemCents: rate.additionalItemCents,
    freeThresholdCents: rate.freeThresholdCents,
    weightTiers: rate.weightTiers,
  };
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

function computeRateShippingCents(
  config: RateConfig,
  context: {
    orderSubtotalCents: number;
    groupWeightOz: number;
    groupQuantity: number;
  },
): number {
  if (config.kind === "free_shipping") {
    return 0;
  }

  const firstItemCents = config.amountCents ?? 0;
  const additionalItemCents = config.additionalItemCents ?? 0;
  const byQuantityCents =
    firstItemCents +
    Math.max(0, context.groupQuantity - 1) * additionalItemCents;

  if (config.kind === "free_over_threshold") {
    if (
      config.freeThresholdCents != null &&
      context.orderSubtotalCents >= config.freeThresholdCents
    ) {
      return 0;
    }
    return byQuantityCents;
  }

  if (config.kind === "weight_tier") {
    return shippingCentsForWeight(
      parseWeightTiers(config.weightTiers),
      context.groupWeightOz,
    );
  }

  return byQuantityCents;
}

function computeAdditionalOnlyCents(
  config: RateConfig,
  context: {
    orderSubtotalCents: number;
    groupQuantity: number;
  },
): number {
  if (config.kind === "free_shipping") {
    return 0;
  }

  if (
    config.kind === "free_over_threshold" &&
    config.freeThresholdCents != null &&
    context.orderSubtotalCents >= config.freeThresholdCents
  ) {
    return 0;
  }
  return (config.additionalItemCents ?? 0) * context.groupQuantity;
}

function firstItemCentsForCombine(config: RateConfig): number {
  if (config.kind === "free_shipping") {
    return 0;
  }
  return config.amountCents ?? 0;
}

function combineGroupsShippingCents(
  groups: ProfileGroup[],
  productById: Map<string, ProductRecord>,
  orderSubtotalCents: number,
  getRateConfig: (profile: ShippingProfileRecord) => RateConfig,
): number {
  let nonCombinedShippingCents = 0;
  const combinedCandidates: {
    groupTotalCents: number;
    firstItemCents: number;
    additionalOnlyCents: number;
  }[] = [];

  for (const { profile, lines } of groups) {
    const config = getRateConfig(profile);
    const groupQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    const groupWeightOz = lines.reduce((sum, line) => {
      const product = productById.get(line.productId);
      const weightOz = product?.weightOz ?? 0;
      return sum + weightOz * line.quantity;
    }, 0);

    if (config.kind === "weight_tier" && groupWeightOz <= 0) {
      throw new Error(
        `Profile "${profile.name}" uses weight tiers but "${lines[0]?.title ?? "item"}" has no weight (oz). Set weight on the product.`,
      );
    }

    const groupTotalCents = computeRateShippingCents(config, {
      orderSubtotalCents,
      groupWeightOz,
      groupQuantity,
    });

    if (config.kind === "weight_tier") {
      nonCombinedShippingCents += groupTotalCents;
      continue;
    }

    combinedCandidates.push({
      groupTotalCents,
      firstItemCents: firstItemCentsForCombine(config),
      additionalOnlyCents: computeAdditionalOnlyCents(config, {
        orderSubtotalCents,
        groupQuantity,
      }),
    });
  }

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

  return nonCombinedShippingCents + combinedShippingCents;
}

function internationalRateOptionKey(rate: InternationalShippingRate): string {
  const countries =
    rate.countriesMode === "all"
      ? "ALL"
      : [...(rate.countries ?? [])].sort().join(",");
  return [
    countries,
    rate.kind,
    rate.amountCents,
    rate.additionalItemCents,
    rate.freeThresholdCents ?? "",
    JSON.stringify(rate.weightTiers ?? []),
  ].join("|");
}

function internationalRateDisplayName(rate: InternationalShippingRate): string {
  const zone =
    rate.countriesMode === "all"
      ? "International (all countries)"
      : `International (${(rate.countries ?? []).join(", ")})`;
  if (rate.kind === "free_shipping") {
    return `${zone} — Free shipping`;
  }
  return zone;
}

function internationalRateCountries(rate: InternationalShippingRate): string[] {
  if (rate.countriesMode === "all") {
    return ALL_INTERNATIONAL_COUNTRY_CODES;
  }
  return (rate.countries ?? []).filter((code) => code !== US_SHIPPING_COUNTRY);
}

function buildProfileGroups(
  lineItems: CheckoutLineItem[],
  productById: Map<string, ProductRecord>,
  profileById: Map<string, ShippingProfileRecord>,
  defaultProfile: ShippingProfileRecord | null,
): ProfileGroup[] {
  const groups = new Map<string, ProfileGroup>();

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

    const internationalRates = parseInternationalRates(profile.internationalRates);
    if (!internationalRates.length) {
      throw new Error(
        `Shipping profile "${profile.name}" has no international rates. Add at least one in Admin → Shipping.`,
      );
    }

    const existing = groups.get(profileId);
    if (existing) {
      existing.lines.push(line);
    } else {
      groups.set(profileId, { profile, lines: [line] });
    }
  }

  return [...groups.values()];
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
  shippingOptions: ResolvedShippingOption[];
} {
  if (!lineItems.length) {
    throw new Error("Cart is empty");
  }

  const groups = buildProfileGroups(
    lineItems,
    productById,
    profileById,
    defaultProfile,
  );

  const orderSubtotalCents = lineItems.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );

  const profileIds = groups.map((group) => group.profile.id);
  const countrySet = new Set<string>([US_SHIPPING_COUNTRY]);

  const usShippingCents = combineGroupsShippingCents(
    groups,
    productById,
    orderSubtotalCents,
    profileToUsRateConfig,
  );

  const profiles = groups.map((group) => group.profile);
  const displayName =
    profiles.length === 1 ? profiles[0]!.name : "Shipping";

  const internationalOptionMap = new Map<
    string,
    { displayName: string }
  >();

  for (const group of groups) {
    const rates = parseInternationalRates(group.profile.internationalRates);
    for (const rate of rates) {
      const key = internationalRateOptionKey(rate);
      if (!internationalOptionMap.has(key)) {
        internationalOptionMap.set(key, {
          displayName: internationalRateDisplayName(rate),
        });
      }
      for (const code of internationalRateCountries(rate)) {
        countrySet.add(code);
      }
    }
  }

  const shippingOptions: ResolvedShippingOption[] = [
    {
      displayName:
        profiles.length === 1
          ? `US — ${profiles[0]!.name}`
          : "US shipping",
      amountCents: usShippingCents,
      optionKey: "us",
    },
  ];

  for (const [optionKey, entry] of internationalOptionMap) {
    const amountCents = combineGroupsShippingCents(
      groups,
      productById,
      orderSubtotalCents,
      (profile) => {
        const rates = parseInternationalRates(profile.internationalRates);
        const match = rates.find(
          (rate) => internationalRateOptionKey(rate) === optionKey,
        );
        return internationalRateToConfig(match ?? rates[0]!);
      },
    );

    shippingOptions.push({
      displayName: entry.displayName,
      amountCents,
      optionKey,
    });
  }

  return {
    totalShippingCents: usShippingCents,
    profileIds,
    allowedCountries: [...countrySet],
    displayName,
    shippingOptions,
  };
}

export function buildStripeShippingOptions(
  resolved: ReturnType<typeof resolveCartShipping>,
): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  const metadata = {
    shippingProfileIds: resolved.profileIds.join(","),
  };

  return resolved.shippingOptions.map((option) => ({
    shipping_rate_data: {
      type: "fixed_amount",
      tax_behavior: "exclusive",
      tax_code: STRIPE_SHIPPING_TAX_CODE,
      fixed_amount: {
        amount: option.amountCents,
        currency: "usd",
      },
      display_name: option.displayName,
      metadata: {
        ...metadata,
        shippingOptionKey: option.optionKey,
      },
    },
  }));
}
