import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { formatPrice } from "@/data/seedProducts";
import { MAX_LINE_QTY } from "@/lib/cartConstants";
import { findCatalogProduct } from "@/lib/cartLineImage";

export type CartLineIssueKind =
  | "removed"
  | "out_of_stock"
  | "price_changed"
  | "quantity";

export interface CartLineIssue {
  key: string;
  title: string;
  message: string;
  kind: CartLineIssueKind;
  blocksCheckout: boolean;
}

export { findCatalogProduct };

function resolveUnitPriceCents(
  product: Product,
  variantId: string | undefined,
): number {
  if (!variantId) return product.priceCents;
  const variant = product.variants?.find((v) => v.id === variantId);
  return product.priceCents + (variant?.priceDeltaCents ?? 0);
}

/** True when the catalog finished loading (independent of cart line match). */
export function isCartCatalogLoaded(catalogLoading: boolean): boolean {
  return !catalogLoading;
}

/** True when every cart line resolves to a catalog product (none delisted). */
export function isCartCatalogVerified(
  items: CartLine[],
  products: Product[],
  catalogLoading: boolean,
): boolean {
  if (catalogLoading || !items.length || !products.length) return false;
  return items.every((item) => Boolean(findCatalogProduct(item, products)));
}

/** Checks cart lines against live catalog before checkout. */
export function getCartLineIssues(
  items: CartLine[],
  products: Product[],
  catalogLoaded = true,
): CartLineIssue[] {
  const issues: CartLineIssue[] = [];

  if (!catalogLoaded) return issues;

  for (const item of items) {
    const product = findCatalogProduct(item, products);

    if (!product) {
      issues.push({
        key: item.key,
        title: item.title,
        message: "This item was removed from the store.",
        kind: "removed",
        blocksCheckout: true,
      });
      continue;
    }

    if (!product.inStock) {
      issues.push({
        key: item.key,
        title: item.title,
        message: "Out of stock — remove before checkout.",
        kind: "out_of_stock",
        blocksCheckout: true,
      });
    }

    const currentPriceCents = resolveUnitPriceCents(product, item.variantId);
    if (currentPriceCents !== item.priceCents) {
      issues.push({
        key: item.key,
        title: item.title,
        message: `Price changed to ${formatPrice(currentPriceCents)} — open the product page to refresh your cart.`,
        kind: "price_changed",
        blocksCheckout: true,
      });
    }

    if (item.quantity > MAX_LINE_QTY) {
      issues.push({
        key: item.key,
        title: item.title,
        message: `Maximum ${MAX_LINE_QTY} per line.`,
        kind: "quantity",
        blocksCheckout: true,
      });
    }
  }

  return issues;
}

export function issuesByLineKey(
  issues: CartLineIssue[],
): Map<string, CartLineIssue> {
  return new Map(issues.map((issue) => [issue.key, issue]));
}

export function filterPurchasableCartLines(
  items: CartLine[],
  products: Product[],
  catalogLoaded = true,
): CartLine[] {
  const blocked = new Set(
    getCartLineIssues(items, products, catalogLoaded)
      .filter((issue) => issue.blocksCheckout)
      .map((issue) => issue.key),
  );
  return items.filter((item) => !blocked.has(item.key));
}

export function cartSubtotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

/** Alias for callers expecting validation-shaped issues. */
export function validateCartLines(
  items: CartLine[],
  products: Product[],
): CartLineIssue[] {
  return getCartLineIssues(items, products);
}
