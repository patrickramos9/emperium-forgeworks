import { useEffect, useState } from "react";
import { SEED_PRODUCTS, type Product } from "@/data/seedProducts";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { listAllProducts } from "@/lib/listAllProducts";
import { mapAmplifyProduct } from "@/lib/mapAmplifyProduct";

export function useProducts() {
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
          setProducts(SEED_PRODUCTS);
          setSource("seed");
          setLoadError("Amplify not configured — showing seed catalog.");
          setLoading(false);
        }
        return;
      }

      try {
        const rows = await listAllProducts(client);
        if (!cancelled) {
          setProducts(rows.map(mapAmplifyProduct));
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
  }, []);

  return { products, loading, source, loadError };
}

export function useProduct(slug: string | undefined) {
  const { products, loading } = useProducts();
  const product = slug
    ? products.find((p) => p.slug === slug)
    : undefined;
  return { product, loading };
}
