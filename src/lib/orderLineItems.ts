import type { CartLine } from "@/context/CartContext";

/** Minimal line-item snapshot stored on Order (no PII beyond product refs). */
export interface OrderLineItemSnapshot {
  productId: string;
  slug: string;
  variantId?: string;
  title: string;
  quantity: number;
  priceCents: number;
}

export function toOrderLineItemSnapshots(
  items: CartLine[],
): OrderLineItemSnapshot[] {
  return items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    variantId: item.variantId,
    title: item.variantLabel
      ? `${item.title} (${item.variantLabel})`
      : item.title,
    quantity: item.quantity,
    priceCents: item.priceCents,
  }));
}
