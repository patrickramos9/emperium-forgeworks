import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { formatPrice } from "@/data/seedProducts";
import { MAX_LINE_QTY } from "@/lib/cartConstants";

export interface CartValidationIssue {
  key: string;
  title: string;
  message: string;
}

function resolveUnitPriceCents(
  product: Product,
  variantId: string | undefined,
): number {
  if (!variantId) return product.priceCents;
  const variant = product.variants?.find((v) => v.id === variantId);
  return product.priceCents + (variant?.priceDeltaCents ?? 0);
}

/** Checks cart lines against live catalog before checkout. */
export function validateCartLines(
  items: CartLine[],
  products: Product[],
): CartValidationIssue[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const issues: CartValidationIssue[] = [];

  for (const item of items) {
    const product = byId.get(item.productId);

    if (!product) {
      issues.push({
        key: item.key,
        title: item.title,
        message: "This item is no longer available.",
      });
      continue;
    }

    if (!product.inStock) {
      issues.push({
        key: item.key,
        title: item.title,
        message: "Out of stock — remove before checkout.",
      });
    }

    const currentPriceCents = resolveUnitPriceCents(product, item.variantId);
    if (currentPriceCents !== item.priceCents) {
      issues.push({
        key: item.key,
        title: item.title,
        message: `Price changed to ${formatPrice(currentPriceCents)} — refresh from the product page.`,
      });
    }

    if (item.quantity > MAX_LINE_QTY) {
      issues.push({
        key: item.key,
        title: item.title,
        message: `Maximum ${MAX_LINE_QTY} per line.`,
      });
    }
  }

  return issues;
}
