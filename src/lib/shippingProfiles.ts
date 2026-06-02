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
