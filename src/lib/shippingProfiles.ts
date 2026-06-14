export type ShippingProfileKind =
  | "flat"
  | "free_over_threshold"
  | "weight_tier"
  | "free_shipping";

export type InternationalCountriesMode = "all" | "list";

export type WeightTier = {
  maxWeightOz: number;
  amountCents: number;
};

export type InternationalShippingRate = {
  kind: ShippingProfileKind;
  amountCents: number;
  additionalItemCents: number;
  freeThresholdCents?: number;
  weightTiers?: WeightTier[];
  countriesMode: InternationalCountriesMode;
  countries?: string[];
};

export const US_SHIPPING_COUNTRY = "US";

/** Stripe Checkout–supported destinations (excludes US) for “all international” mode. */
export const ALL_INTERNATIONAL_COUNTRY_CODES = [
  "AC",
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AQ",
  "AR",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CV",
  "CW",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SZ",
  "TA",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VN",
  "VU",
  "WF",
  "WS",
  "XK",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
] as const;

export const SHIPPING_PROFILE_KIND_LABELS: Record<ShippingProfileKind, string> =
  {
    flat: "Flat rate",
    free_over_threshold: "Free over order subtotal",
    weight_tier: "Weight tiers",
    free_shipping: "Free shipping",
  };

export function defaultInternationalRate(): InternationalShippingRate {
  return {
    kind: "flat",
    amountCents: 2499,
    additionalItemCents: 500,
    countriesMode: "all",
    countries: [],
  };
}

export function parseInternationalRates(
  raw: unknown,
): InternationalShippingRate[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        kind: normalizeShippingKind(row?.kind),
        amountCents: Number(row?.amountCents) || 0,
        additionalItemCents: Number(row?.additionalItemCents) || 0,
        freeThresholdCents:
          row?.freeThresholdCents != null
            ? Number(row.freeThresholdCents)
            : undefined,
        weightTiers: parseWeightTiers(row?.weightTiers),
        countriesMode:
          row?.countriesMode === "list" ? ("list" as const) : ("all" as const),
        countries: parseCountryCodes(
          Array.isArray(row?.countries)
            ? row.countries.join(", ")
            : String(row?.countries ?? ""),
        ),
      }))
      .filter((row) => row.kind != null);
  } catch {
    return [];
  }
}

function normalizeShippingKind(raw: unknown): ShippingProfileKind | null {
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

export function internationalRateCountries(
  rate: InternationalShippingRate,
): string[] {
  if (rate.countriesMode === "all") {
    return [...ALL_INTERNATIONAL_COUNTRY_CODES];
  }
  return (rate.countries ?? []).filter((code) => code !== US_SHIPPING_COUNTRY);
}

export function internationalRateOptionKey(rate: InternationalShippingRate): string {
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

export function internationalRateDisplayName(
  rate: InternationalShippingRate,
): string {
  const zone =
    rate.countriesMode === "all"
      ? "International (all countries)"
      : `International (${formatCountryCodes(rate.countries)})`;
  if (rate.kind === "free_shipping") {
    return `${zone} — Free shipping`;
  }
  return zone;
}

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
  if (kind === "free_shipping") {
    return "Free shipping";
  }

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

export function formatCountryCodes(
  codes: (string | null | undefined)[] | null | undefined,
): string {
  const sanitized = sanitizeCountryCodes(codes);
  if (!sanitized.length) return US_SHIPPING_COUNTRY;
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
  internationalRates?: unknown;
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

export function sortShippingProfiles<
  T extends { sortOrder?: number | null; name?: string | null },
>(profiles: T[]): T[] {
  return [...profiles].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  );
}

export function firstActiveShippingProfile<
  T extends ProductShippingProfileLike,
>(profiles: T[]): T | null {
  const active = sortShippingProfiles(
    profiles.filter((profile) => profile.active !== false),
  );
  return active[0] ?? null;
}

export function resolveProductShippingProfile<
  T extends ProductShippingProfileLike,
>(
  product: { shippingProfileId?: string | null },
  profiles: T[],
): T | null {
  const active = profiles.filter((profile) => profile.active !== false);
  if (product.shippingProfileId) {
    const assigned = active.find(
      (profile) => profile.id === product.shippingProfileId,
    );
    if (assigned) return assigned;
  }
  return firstActiveShippingProfile(profiles);
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
  const profile = assigned ?? firstActiveShippingProfile(profiles);

  if (!profile) {
    return { profileLabel: "No profile", kindLabel: "—" };
  }

  const kind = profile.kind;
  const kindLabel =
    kind && kind in SHIPPING_PROFILE_KIND_LABELS
      ? SHIPPING_PROFILE_KIND_LABELS[kind]
      : "—";
  const profileLabel = profile.name?.trim() || "Shipping profile";

  return { profileLabel, kindLabel };
}

function normalizeProfileKind(
  kind: ShippingProfileKind | null | undefined,
): ShippingProfileKind {
  if (
    kind === "free_over_threshold" ||
    kind === "weight_tier" ||
    kind === "free_shipping"
  ) {
    return kind;
  }
  return "flat";
}

/** Single-item shipping summary for product detail pages. */
export function formatProductShippingDisplay(
  profile: ProductShippingProfileLike,
  options: {
    weightOz?: number | null;
    formatPrice: (cents: number) => string;
  },
): ProductShippingDisplay {
  const kind = normalizeProfileKind(profile.kind);
  const tiers = parseWeightTiers(profile.weightTiers);
  const weightOz = options.weightOz ?? 0;
  const internationalRates = parseInternationalRates(profile.internationalRates);

  let usLabel: string;
  if (kind === "weight_tier") {
    if (weightOz > 0 && tiers.length) {
      usLabel = `${options.formatPrice(shippingCentsForWeight(tiers, weightOz))} US shipping (this item)`;
    } else {
      usLabel = `${formatShippingProfileRate(
        kind,
        profile.amountCents,
        profile.additionalItemCents,
        profile.freeThresholdCents,
        options.formatPrice,
        tiers,
      )} (US)`;
    }
  } else {
    const base = formatShippingProfileRate(
      kind,
      profile.amountCents,
      profile.additionalItemCents,
      profile.freeThresholdCents,
      options.formatPrice,
    );
    usLabel =
      kind === "free_over_threshold"
        ? `${base} on your order (US)`
        : kind === "free_shipping"
          ? "Free US shipping"
          : `${base} US shipping`;
  }

  const intlSummary =
    internationalRates.length > 0
      ? internationalRates
          .slice(0, 2)
          .map((rate) => internationalRateDisplayName(rate))
          .join(" · ")
      : null;

  return {
    profileName: profile.name?.trim() || "Standard shipping",
    rateLabel: intlSummary ? `${usLabel} · ${intlSummary}` : usLabel,
    readyToShipLabel: formatReadyToShip(
      profile.minReadyToShipDays,
      profile.maxReadyToShipDays,
    ),
  };
}

export function validateInternationalRates(
  rates: InternationalShippingRate[],
): string | null {
  if (!rates.length) {
    return "Add at least one international rate.";
  }
  for (const [index, rate] of rates.entries()) {
    if (rate.countriesMode === "list" && !rate.countries?.length) {
      return `International rate ${index + 1}: enter country codes or choose All countries.`;
    }
    if (rate.kind === "weight_tier" && !rate.weightTiers?.length) {
      return `International rate ${index + 1}: add at least one weight tier.`;
    }
    if (
      rate.kind === "free_over_threshold" &&
      (rate.freeThresholdCents == null || rate.freeThresholdCents <= 0)
    ) {
      return `International rate ${index + 1}: set a free-shipping threshold.`;
    }
  }
  return null;
}
