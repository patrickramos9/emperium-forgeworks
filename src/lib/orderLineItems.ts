import type { CartLine } from "@/context/CartContext";

/** Minimal line-item snapshot stored on Order (no PII beyond product refs). */
export interface OrderLineItemSnapshot {
  productId: string;
  slug: string;
  variantId?: string;
  /** Human-readable variant (e.g. 150mm, Glossy / 32mm). */
  variantLabel?: string;
  title: string;
  quantity: number;
  priceCents: number;
}

export function orderLineItemDisplay(item: OrderLineItemSnapshot): {
  productTitle: string;
  variantLabel: string | undefined;
} {
  const explicit = item.variantLabel?.trim();
  if (explicit) {
    return { productTitle: item.title, variantLabel: explicit };
  }

  /** Legacy snapshots merged variant into title: "Product (150mm)". */
  const match = item.title.match(/^(.+?)\s+\(([^)]+)\)$/);
  if (match) {
    return {
      productTitle: match[1].trim(),
      variantLabel: match[2].trim(),
    };
  }

  return { productTitle: item.title, variantLabel: undefined };
}

export function formatOrderLineItemSummary(item: OrderLineItemSnapshot): string {
  const { productTitle, variantLabel } = orderLineItemDisplay(item);
  if (!variantLabel) return productTitle;
  return `${productTitle} — ${variantLabel}`;
}

export function toOrderLineItemSnapshots(
  items: CartLine[],
): OrderLineItemSnapshot[] {
  return items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    variantId: item.variantId,
    variantLabel: item.variantLabel?.trim() || undefined,
    title: item.title,
    quantity: item.quantity,
    priceCents: item.priceCents,
  }));
}
