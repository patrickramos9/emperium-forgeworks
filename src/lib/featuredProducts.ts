import type { Product } from "@/data/seedProducts";

export const MAX_FEATURED_PRODUCTS = 4;

export function pickFeaturedProducts(products: Product[]): Product[] {
  return products
    .filter((product) => product.featured)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, MAX_FEATURED_PRODUCTS);
}
