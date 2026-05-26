import { useEffect, useState } from "react";
import { SEED_PRODUCTS, type Product } from "@/data/seedProducts";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import {
  filterCatalog,
  type CatalogMode,
} from "@/lib/catalogFilter";
import { listAllProducts } from "@/lib/listAllProducts";
import { mapAmplifyProduct } from "@/lib/mapAmplifyProduct";
import { resolveProductImages } from "@/lib/productImageUrls";

export function useProducts(mode: CatalogMode = "public") {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"seed" | "amplify">("amplify");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError(null);
      const client = await getGuestDataClient();

      if (!client) {
        if (!cancelled) {
          setProducts(filterCatalog(SEED_PRODUCTS, mode));
          setSource("seed");
          setLoadError("Amplify not configured — showing seed catalog.");
          setLoading(false);
        }
        return;
      }

      try {
        const rows = await listAllProducts(client);
        const mapped = filterCatalog(rows.map(mapAmplifyProduct), mode);
        const resolved = await Promise.all(mapped.map(resolveProductImages));
        if (!cancelled) {
          setProducts(resolved);
          setSource("amplify");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[useProducts] API load failed", err);
          setProducts([]);
          setSource("amplify");
          setLoadError(
            err instanceof Error ? err.message : "Could not load catalog from API",
          );
        }
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return { products, loading, source, loadError };
}

export function useProduct(
  slug: string | undefined,
  mode: CatalogMode = "public",
) {
  const { products, loading } = useProducts(mode);
  const product = slug
    ? products.find((p) => p.slug === slug)
    : undefined;
  return { product, loading };
}
