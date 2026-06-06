/** Lambda copy of promo discount logic (keep in sync with src/lib/promoGrants.ts). */

export type PromoTemplateLike = {
  kind?: "percent" | "fixed" | null;
  percent?: number | null;
  amountCents?: number | null;
  active?: boolean | null;
  name?: string | null;
};

export type PromoGrantLike = {
  id: string;
  templateId: string;
  userId: string;
  productId?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  redeemedAt?: string | null;
};

export type LineForPromo = {
  productId: string;
  slug?: string;
  priceCents: number;
  quantity: number;
};

export type CatalogRefForPromo = {
  id: string;
  slug: string;
};

function findCartLineForGrantProduct(
  grantProductId: string,
  lines: LineForPromo[],
  catalog?: CatalogRefForPromo[],
): LineForPromo | undefined {
  const byId = lines.find((row) => row.productId === grantProductId);
  if (byId) return byId;

  const catalogSlug = catalog?.find((p) => p.id === grantProductId)?.slug;
  if (catalogSlug) {
    return lines.find((row) => row.slug === catalogSlug);
  }

  return undefined;
}

const INDEFINITE_ISO = "2099-12-31T23:59:59.999Z";

function grantExpiresAtIso(expiresAt: string | null | undefined): string {
  return expiresAt?.trim() || INDEFINITE_ISO;
}

export function isGrantActive(grant: PromoGrantLike, nowMs = Date.now()): boolean {
  if (grant.revokedAt) return false;
  if (grant.redeemedAt) return false;
  return Date.parse(grantExpiresAtIso(grant.expiresAt)) > nowMs;
}

function computeTemplateDiscountCents(
  template: PromoTemplateLike,
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
  grant: PromoGrantLike,
  template: PromoTemplateLike,
  lines: LineForPromo[],
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
    return computeTemplateDiscountCents(
      template,
      line.priceCents * line.quantity,
    );
  }

  return computeTemplateDiscountCents(template, subtotalCents);
}

export function pickBestGrant(
  candidates: {
    grant: PromoGrantLike;
    discountCents: number;
  }[],
): (typeof candidates)[number] | null {
  if (!candidates.length) return null;
  return candidates.reduce((best, row) => {
    if (row.discountCents > best.discountCents) return row;
    if (row.discountCents < best.discountCents) return best;
    const bestExp = Date.parse(grantExpiresAtIso(best.grant.expiresAt));
    const rowExp = Date.parse(grantExpiresAtIso(row.grant.expiresAt));
    return rowExp < bestExp ? row : best;
  });
}

export function distributeDiscountToLines<T extends { priceCents: number; quantity: number }>(
  items: T[],
  discountCents: number,
): T[] {
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
