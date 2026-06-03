import { useEffect, useState } from "react";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import type { Product } from "@/data/seedProducts";
import type { ProductShippingDisplay } from "@/lib/shippingProfiles";
import { resolveShippingDisplayForProduct } from "@/services/productShippingService";

export function useProductShippingDisplay(product: Product | undefined) {
  const [shipping, setShipping] = useState<ProductShippingDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!product) {
        setShipping(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const client = await getGuestDataClient();
      if (!client) {
        if (!cancelled) {
          setShipping(null);
          setError("Store API is not configured.");
          setLoading(false);
        }
        return;
      }

      const result = await resolveShippingDisplayForProduct(client, product);
      if (cancelled) return;

      setShipping(result.display);
      setError(result.display ? null : result.error);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    product?.id,
    product?.shippingProfileId,
    product?.weightOz,
    product?.shippingDisplay,
  ]);

  return { shipping, loading, error };
}
