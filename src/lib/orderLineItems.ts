import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";

/** Minimal line-item snapshot stored on Order (no PII beyond product refs). */
export interface OrderLineItemSnapshot {
  productId: string;
  slug: string;
  variantId?: string;
  /** Human-readable variant (e.g. 150mm, Glossy / 32mm). */
  variantLabel?: string;
  /** When true, product detail lives under /vault/:slug. */
  vaultOnly?: boolean;
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

/** Storefront PDP path when the product still exists; null when delisted or unknown. */
export function resolveOrderLineItemHref(
  item: OrderLineItemSnapshot,
  products: Product[] = [],
  catalogLoaded = false,
): string | null {
  const product =
    products.find((row) => row.id === item.productId) ??
    products.find((row) => row.slug === item.slug);

  if (product) {
    const base = product.vaultOnly ? "/vault" : "/shop";
    return `${base}/${product.slug}`;
  }

  if (catalogLoaded) return null;

  const slug = item.slug?.trim();
  if (!slug) return null;

  const base = item.vaultOnly ? "/vault" : "/shop";
  return `${base}/${slug}`;
}

export function toOrderLineItemSnapshots(
  items: CartLine[],
  products: Product[] = [],
): OrderLineItemSnapshot[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  return items.map((item) => {
    const product =
      byId.get(item.productId) ?? bySlug.get(item.slug);
    return {
      productId: product?.id ?? item.productId,
      slug: product?.slug ?? item.slug,
      variantId: item.variantId,
      variantLabel: item.variantLabel?.trim() || undefined,
      ...(product?.vaultOnly ? { vaultOnly: true } : {}),
      title: item.title,
      quantity: item.quantity,
      priceCents: item.priceCents,
    };
  });
}
