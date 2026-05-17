import { useEffect, useState } from "react";
import { SEED_PRODUCTS, type Product } from "@/data/seedProducts";
import { configureAmplify } from "@/lib/amplify";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"seed" | "amplify">("seed");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const ok = await configureAmplify();
      if (!ok || cancelled) {
        setLoading(false);
        return;
      }

      try {
        const { generateClient } = await import("aws-amplify/data");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = generateClient<any>();
        const { data, errors } = await client.models.Product.list({});
        if (!cancelled && data?.length && !errors?.length) {
          setProducts(
            data.map((row) => ({
              id: row.id,
              slug: row.slug,
              title: row.title,
              detailImage: row.detailImage ?? undefined,
              subtitle: row.subtitle ?? undefined,
              description: row.description ?? undefined,
              lore: row.lore ?? undefined,
              category: row.category as Product["category"],
              priceCents: row.priceCents,
              badges: (row.badges ?? []).filter(Boolean) as string[],
              images: (row.images ?? []).filter(Boolean) as string[],
              variants: (row.variants ?? []) as Product["variants"],
              specs: row.specs as Product["specs"],
              inStock: row.inStock ?? true,
              featured: row.featured ?? false,
              sortOrder: row.sortOrder ?? 0,
            })),
          );
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
