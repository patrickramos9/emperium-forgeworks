import { useMemo } from "react";
import { formatPrice, type Product } from "@/data/seedProducts";
import {
  formatProductShippingDisplay,
  resolveProductShippingProfile,
  type ProductShippingDisplay,
} from "@/lib/shippingProfiles";
import type { ShippingProfileRecord } from "@/services/shippingProfileService";

export function useProductShippingDisplay(
  product: Product | undefined,
  profiles: ShippingProfileRecord[],
  profilesLoading: boolean,
): { shipping: ProductShippingDisplay | null; loading: boolean } {
  const shipping = useMemo(() => {
    if (!product) return null;
    const profile = resolveProductShippingProfile(product, profiles);
    if (!profile) return null;
    return formatProductShippingDisplay(profile, {
      weightOz: product.weightOz,
      formatPrice,
    });
  }, [product, profiles]);

  return {
    shipping,
    loading: profilesLoading && !profiles.length,
  };
}
