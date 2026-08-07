import type { Schema } from "../../data/resource";

export type CartSnapshotLine = Schema["CartSnapshotLine"]["type"];

export function parseLineItems(raw: unknown): CartSnapshotLine[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (row): row is CartSnapshotLine =>
        row != null && typeof row === "object" && "quantity" in row,
    );
  }
  if (typeof raw === "string") {
    try {
      return parseLineItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function snapshotHasItems(
  lineItems: CartSnapshotLine[] | null | undefined,
): boolean {
  return (lineItems ?? []).some((row) => row && row.quantity > 0);
}

/** Stable signature — slug/qty/price only so catalog id sync does not reset idle time. */
export function snapshotSignature(lineItems: CartSnapshotLine[]): string {
  return JSON.stringify(
    lineItems
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        slug: row.slug ?? row.productId,
        quantity: row.quantity,
        priceCents: row.priceCents,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
  );
}

export function normalizeLineItems(
  lineItems: CartSnapshotLine[],
): CartSnapshotLine[] {
  return lineItems
    .filter((row) => row && row.quantity > 0)
    .map((row) => ({
      productId: row.productId,
      slug: row.slug?.trim() || row.productId,
      quantity: row.quantity,
      priceCents: row.priceCents,
      ...(row.title?.trim() ? { title: row.title.trim() } : {}),
    }));
}

/** CartSnapshot.lineItems is a.json() — AppSync expects a serialized JSON string. */
export function lineItemsJsonFromSnapshot(
  lineItems: CartSnapshotLine[],
): string {
  return JSON.stringify(normalizeLineItems(lineItems));
}

/**
 * Union guest + user lines. Prefer user cart on same productId conflict (M6e).
 */
export function mergeCartLineItems(
  userLines: CartSnapshotLine[],
  guestLines: CartSnapshotLine[],
): CartSnapshotLine[] {
  const byProduct = new Map<string, CartSnapshotLine>();
  for (const row of normalizeLineItems(userLines)) {
    byProduct.set(row.productId, row);
  }
  for (const row of normalizeLineItems(guestLines)) {
    if (!byProduct.has(row.productId)) {
      byProduct.set(row.productId, row);
    }
  }
  return [...byProduct.values()];
}
