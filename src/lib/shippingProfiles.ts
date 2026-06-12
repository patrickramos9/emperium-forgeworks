export type ShippingProfileKind =
  | "flat"
  | "free_over_threshold"
  | "weight_tier";

export type WeightTier = {
  maxWeightOz: number;
  amountCents: number;
};

export const SHIPPING_PROFILE_KIND_LABELS: Record<ShippingProfileKind, string> =
  {
    flat: "Flat rate",
    free_over_threshold: "Free over order subtotal",
    weight_tier: "Weight tiers",
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

export function formatShippingProfileRate(
  kind: ShippingProfileKind | null | undefined,
  amountCents: number | null | undefined,
  additionalItemCents: number | null | undefined,
  freeThresholdCents: number | null | undefined,
  formatPrice: (cents: number) => string,
  weightTiers?: WeightTier[],
): string {
  if (kind === "weight_tier") {
    const tiers = weightTiers ?? [];
    if (!tiers.length) return "Weight tiers (not configured)";
    const first = tiers[0]!;
    const last = tiers[tiers.length - 1]!;
    if (tiers.length === 1) {
      return `Up to ${first.maxWeightOz} oz — ${formatPrice(first.amountCents)}`;
    }
    return `${formatPrice(first.amountCents)} – ${formatPrice(last.amountCents)} by weight`;
  }

  const amount = amountCents ?? 0;
  const additional = additionalItemCents ?? 0;
  const flatWithAdditional =
    additional > 0
      ? `${formatPrice(amount)} + ${formatPrice(additional)} each additional`
      : formatPrice(amount);

  if (kind === "free_over_threshold" && freeThresholdCents != null) {
    return `${flatWithAdditional} (free over ${formatPrice(freeThresholdCents)})`;
  }
  return flatWithAdditional;
}

export function parseCountryCodes(input: string): string[] {
  return input
    .split(/[,;\s]+/)
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));
}

export function sanitizeCountryCodes(
  codes: (string | null | undefined)[] | null | undefined,
): string[] {
  return (codes ?? []).filter(
    (code): code is string => typeof code === "string" && code.length > 0,
  );
}

export function formatCountryCodes(codes: (string | null | undefined)[] | null | undefined): string {
  const sanitized = sanitizeCountryCodes(codes);
  if (!sanitized.length) return "US";
  return sanitized.join(", ");
}

/** Human-readable ready-to-ship window for admin lists and product copy. */
export function formatReadyToShip(
  minDays: number | null | undefined,
  maxDays: number | null | undefined,
): string | null {
  if (minDays == null && maxDays == null) return null;
  if (minDays != null && maxDays != null) {
    if (minDays === maxDays) {
      return minDays === 1
        ? "Ships in 1 business day"
        : `Ships in ${minDays} business days`;
    }
    if (minDays > 0 && maxDays >= minDays) {
      return `Ships in ${minDays}–${maxDays} business days`;
    }
  }
  if (minDays != null && minDays > 0) {
    return `Ships in ${minDays}+ business days`;
  }
  if (maxDays != null && maxDays > 0) {
    return `Ships within ${maxDays} business days`;
  }
  return null;
}

export function shippingCentsForWeight(
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

export type ProductShippingProfileLike = {
  id?: string | null;
  name?: string | null;
  kind?: ShippingProfileKind | null;
  amountCents?: number | null;
  additionalItemCents?: number | null;
  freeThresholdCents?: number | null;
  weightTiers?: unknown;
  active?: boolean | null;
  isDefault?: boolean | null;
  minReadyToShipDays?: number | null;
  maxReadyToShipDays?: number | null;
};

export type ProductShippingDisplay = {
  profileName: string;
  rateLabel: string;
  readyToShipLabel: string | null;
};

export function resolveProductShippingProfile<
  T extends ProductShippingProfileLike,
>(
  product: { shippingProfileId?: string | null },
  profiles: T[],
): T | null {
  const active = profiles.filter((profile) => profile.active !== false);
  if (product.shippingProfileId) {
    const assigned = active.find((profile) => profile.id === product.shippingProfileId);
    if (assigned) return assigned;
  }
  return active.find((profile) => profile.isDefault) ?? null;
}

/** Admin product list: assigned profile name + shipping kind label. */
export function productShippingAdminLabels(
  product: { shippingProfileId?: string | null },
  profiles: ProductShippingProfileLike[],
): { profileLabel: string; kindLabel: string } {
  const active = profiles.filter((profile) => profile.active !== false);
  const assigned = product.shippingProfileId
    ? active.find((profile) => profile.id === product.shippingProfileId)
    : undefined;
  const profile = assigned ?? active.find((p) => p.isDefault) ?? null;

  if (!profile) {
    return { profileLabel: "No profile", kindLabel: "—" };
  }

  const kind = profile.kind;
  const kindLabel =
    kind && kind in SHIPPING_PROFILE_KIND_LABELS
      ? SHIPPING_PROFILE_KIND_LABELS[kind]
      : "—";
  const profileLabel = assigned
    ? profile.name?.trim() || "Assigned profile"
    : `Store default${profile.name ? ` · ${profile.name}` : ""}`;

  return { profileLabel, kindLabel };
}

/** Single-item shipping summary for product detail pages. */
export function formatProductShippingDisplay(
  profile: ProductShippingProfileLike,
  options: {
    weightOz?: number | null;
    formatPrice: (cents: number) => string;
  },
): ProductShippingDisplay {
  const kind =
    profile.kind === "free_over_threshold"
      ? "free_over_threshold"
      : profile.kind === "weight_tier"
        ? "weight_tier"
        : "flat";
  const tiers = parseWeightTiers(profile.weightTiers);
  const weightOz = options.weightOz ?? 0;

  let rateLabel: string;
  if (kind === "weight_tier") {
    if (weightOz > 0 && tiers.length) {
      rateLabel = `${options.formatPrice(shippingCentsForWeight(tiers, weightOz))} shipping (this item)`;
    } else {
      rateLabel = formatShippingProfileRate(
        kind,
        profile.amountCents,
        profile.additionalItemCents,
        profile.freeThresholdCents,
        options.formatPrice,
        tiers,
      );
    }
  } else {
    const base = formatShippingProfileRate(
      kind,
      profile.amountCents,
      profile.additionalItemCents,
      profile.freeThresholdCents,
      options.formatPrice,
    );
    rateLabel =
      kind === "free_over_threshold"
        ? `${base} on your order`
        : `${base} for the first item`;
  }

  return {
    profileName: profile.name?.trim() || "Standard shipping",
    rateLabel,
    readyToShipLabel: formatReadyToShip(
      profile.minReadyToShipDays,
      profile.maxReadyToShipDays,
    ),
  };
}
