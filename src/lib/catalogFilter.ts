import type { Product } from "@/data/seedProducts";
import { isPrintServiceCatalogSlug } from "@/lib/printService";

export type CatalogMode = "public" | "vault" | "all";

export function filterCatalog(products: Product[], mode: CatalogMode): Product[] {
  switch (mode) {
    case "public":
      return products.filter((p) => !p.vaultOnly && !isPrintServiceCatalogSlug(p.slug));
    case "vault":
      return products.filter((p) => p.vaultOnly);
    case "all":
      return products;
  }
}
