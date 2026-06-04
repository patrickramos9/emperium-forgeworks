import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { productPrimaryImageRef } from "@/lib/productImageUrls";

/** Pick catalog row by Amplify id or slug (cart may predate id changes). */
export function findCatalogProduct(
  item: CartLine,
  products: Product[],
): Product | undefined {
  return (
    products.find((p) => p.id === item.productId) ??
    products.find((p) => p.slug === item.slug)
  );
}

/** Storage path, legacy URL, or static path to resolve for a cart line. */
export function cartLineImageRef(
  item: Pick<CartLine, "imageUrl">,
  product?: Product,
): string | undefined {
  const stored = item.imageUrl?.trim();
  if (stored) return stored;
  if (product) return productPrimaryImageRef(product);
  return undefined;
}
