import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { formatPrintServiceVariantLabel, type PrintServiceLinePayload } from "@/lib/printService";

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
  printService?: PrintServiceLinePayload;
  printServiceJson?: string;
}

export function orderLineItemDisplay(item: OrderLineItemSnapshot): {
  productTitle: string;
  variantLabel: string | undefined;
} {
  if (item.printService) {
    return {
      productTitle: item.title,
      variantLabel: formatPrintServiceVariantLabel(item.printService),
    };
  }

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

export function productDetailPath(product: {
  slug: string;
  vaultOnly?: boolean | null;
}): string {
  const base = product.vaultOnly ? "/vault" : "/shop";
  return `${base}/${product.slug}`;
}

export function productAdminEditPath(slug: string): string {
  return `/admin/products/${slug}`;
}

export type OrderLineItemLinkContext = "storefront" | "admin";

/** Product link for order line items; null when delisted (storefront) or unknown slug. */
export function resolveOrderLineItemHref(
  item: OrderLineItemSnapshot,
  products: Product[] = [],
  catalogLoaded = false,
  linkContext: OrderLineItemLinkContext = "storefront",
): string | null {
  if (item.printService && linkContext === "storefront") {
    return null;
  }

  const product =
    products.find((row) => row.id === item.productId) ??
    products.find((row) => row.slug === item.slug);

  const slug = product?.slug?.trim() || item.slug?.trim();
  if (!slug) return null;

  if (linkContext === "admin") {
    return productAdminEditPath(slug);
  }

  if (product) {
    return productDetailPath(product);
  }

  if (catalogLoaded) return null;

  return productDetailPath({ slug, vaultOnly: item.vaultOnly });
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
    const variantLabel =
      item.printService
        ? formatPrintServiceVariantLabel(item.printService)
        : item.variantLabel?.trim() || undefined;
    return {
      productId: product?.id ?? item.productId,
      slug: product?.slug ?? item.slug,
      variantId: item.variantId,
      variantLabel,
      ...(product?.vaultOnly ? { vaultOnly: true } : {}),
      title: item.title,
      quantity: item.quantity,
      priceCents: item.priceCents,
      ...(item.printService
        ? {
            printService: item.printService,
            printServiceJson: JSON.stringify(item.printService),
          }
        : {}),
    };
  });
}
