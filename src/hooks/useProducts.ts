import { useEffect, useState } from "react";
import { SEED_PRODUCTS, type Product } from "@/data/seedProducts";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { mapAmplifyProduct } from "@/lib/mapAmplifyProduct";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"seed" | "amplify">("seed");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const client = await getGuestDataClient();
      if (!client || cancelled) {
        setLoading(false);
        return;
      }

      try {
        const { data, errors } = await client.models.Product.list({});
        if (!cancelled && data?.length && !errors?.length) {
          setProducts(data.map(mapAmplifyProduct));
          setSource("amplify");
        }
      } catch {
        /* fallback to seed */
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading, source };
}

export function useProduct(slug: string | undefined) {
  const { products, loading } = useProducts();
  const product = slug
    ? products.find((p) => p.slug === slug)
    : undefined;
  return { product, loading };
}
