import type { Schema } from "../../amplify/data/resource";

export type PromoTemplateRecord = Schema["PromoTemplate"]["type"];
export type PromoGrantRecord = Schema["PromoGrant"]["type"];
export type PromoGrantSource = NonNullable<PromoGrantRecord["source"]>;

export type CartLineForPromo = {
  productId: string;
  slug?: string;
  priceCents: number;
  quantity: number;
};

export type CatalogRefForPromo = {
  id: string;
  slug: string;
};

/** Match cart line to a product-scoped grant (id or slug when cart predates id sync). */
export function findCartLineForGrantProduct(
  grantProductId: string,
  lines: CartLineForPromo[],
  catalog?: CatalogRefForPromo[],
): CartLineForPromo | undefined {
  const byId = lines.find((row) => row.productId === grantProductId);
  if (byId) return byId;

  const catalogSlug = catalog?.find((p) => p.id === grantProductId)?.slug;
  if (catalogSlug) {
    const bySlug = lines.find((row) => row.slug === catalogSlug);
    if (bySlug) return bySlug;
  }

  return undefined;
}

export type AppliedPromo = {
  grantId: string;
  source: PromoGrantSource;
  label: string;
  discountCents: number;
  expiresAt: string;
  expiresLabel: string;
};

const INDEFINITE_ISO = "2099-12-31T23:59:59.999Z";

export function grantExpiresAtIso(
  expiresAt: string | null | undefined,
): string {
  return expiresAt?.trim() || INDEFINITE_ISO;
}

export type PromoGrantStatus = "open" | "redeemed" | "revoked" | "expired";

export function formatGrantSourceLabel(
  source: PromoGrantSource | null | undefined,
): string {
  switch (source) {
    case "admin":
      return "Admin";
    case "thank_you":
      return "Thank-you";
    case "favorite":
      return "Favorite";
    case "abandoned_cart":
      return "Abandoned cart";
    default:
      return "—";
  }
}

export function getGrantStatus(
  grant: PromoGrantRecord,
  nowMs = Date.now(),
): PromoGrantStatus {
  if (grant.redeemedAt) return "redeemed";
  if (grant.revokedAt) return "revoked";
  if (!isGrantActive(grant, nowMs)) return "expired";
  return "open";
}

export function formatGrantIssuedAt(
  createdAt: string | null | undefined,
): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isGrantActive(
  grant: PromoGrantRecord,
  nowMs = Date.now(),
): boolean {
  if (grant.revokedAt) return false;
  if (grant.redeemedAt) return false;
  const expires = grantExpiresAtIso(grant.expiresAt);
  return Date.parse(expires) > nowMs;
}

export function formatPromoExpiry(
  expiresAt: string | null | undefined,
): string {
  const iso = grantExpiresAtIso(expiresAt);
  if (iso.startsWith("2099")) return "No expiry";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function computeTemplateDiscountCents(
  template: Pick<
    PromoTemplateRecord,
    "kind" | "percent" | "amountCents"
  >,
  subtotalCents: number,
): number {
  if (subtotalCents <= 0) return 0;
  if (template.kind === "percent") {
    const pct = template.percent ?? 0;
    if (pct <= 0) return 0;
    return Math.min(subtotalCents, Math.round((subtotalCents * pct) / 100));
  }
  const fixed = template.amountCents ?? 0;
  return Math.min(subtotalCents, Math.max(0, fixed));
}

export function computeGrantDiscountCents(
  grant: PromoGrantRecord,
  template: PromoTemplateRecord,
  lines: CartLineForPromo[],
  catalog?: CatalogRefForPromo[],
): number {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.priceCents * line.quantity,
    0,
  );
  if (subtotalCents <= 0) return 0;

  if (grant.productId) {
    const line = findCartLineForGrantProduct(grant.productId, lines, catalog);
    if (!line) return 0;
    const lineSubtotal = line.priceCents * line.quantity;
    return computeTemplateDiscountCents(template, lineSubtotal);
  }

  return computeTemplateDiscountCents(template, subtotalCents);
}

export function buildPromoLabel(
  template: PromoTemplateRecord,
  discountCents: number,
  formatPrice: (cents: number) => string,
): string {
  if (template.kind === "percent" && template.percent) {
    return `${template.name} (${template.percent}% off, −${formatPrice(discountCents)})`;
  }
  return `${template.name} (−${formatPrice(discountCents)})`;
}

export function pickBestGrant(
  candidates: {
    grant: PromoGrantRecord;
    template: PromoTemplateRecord;
    discountCents: number;
  }[],
  preferSource?: PromoGrantSource,
): (typeof candidates)[number] | null {
  if (!candidates.length) return null;

  if (preferSource) {
    const preferred = candidates.filter((row) => row.grant.source === preferSource);
    const preferredWinner = pickBestGrant(preferred);
    if (preferredWinner) return preferredWinner;
  }

  return candidates.reduce((best, row) => {
    if (row.discountCents > best.discountCents) return row;
    if (row.discountCents < best.discountCents) return best;
    const bestExp = Date.parse(grantExpiresAtIso(best.grant.expiresAt));
    const rowExp = Date.parse(grantExpiresAtIso(row.grant.expiresAt));
    return rowExp < bestExp ? row : best;
  });
}

/** Spread discount across Stripe line items (proportional, last line absorbs rounding). */
export function distributeDiscountToLines<
  T extends { priceCents: number; quantity: number },
>(items: T[], discountCents: number): T[] {
  const subtotal = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );
  if (discountCents <= 0 || subtotal <= 0) {
    return items.map((item) => ({ ...item }));
  }

  const discount = Math.min(discountCents, subtotal);
  let assigned = 0;

  return items.map((item, index) => {
    const lineTotal = item.priceCents * item.quantity;
    let lineDiscount =
      index === items.length - 1
        ? discount - assigned
        : Math.floor((lineTotal / subtotal) * discount);
    lineDiscount = Math.min(lineDiscount, lineTotal);
    assigned += lineDiscount;

    const newLineTotal = lineTotal - lineDiscount;
    const unit =
      item.quantity > 0
        ? Math.max(0, Math.floor(newLineTotal / item.quantity))
        : 0;
    return { ...item, priceCents: unit };
  });
}

export function expiresAtFromTemplateDays(
  defaultExpiresInDays: number | null | undefined,
): string {
  if (defaultExpiresInDays == null || defaultExpiresInDays <= 0) {
    return INDEFINITE_ISO;
  }
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + defaultExpiresInDays);
  return date.toISOString();
}
