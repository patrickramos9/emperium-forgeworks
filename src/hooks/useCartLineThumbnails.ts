import { useEffect, useState } from "react";
import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { isStoragePath } from "@/lib/productImageRefs";
import { productPrimaryImage, resolveImageUrl } from "@/lib/productImageUrls";

function isBrowsableImageUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  return url.startsWith("http") || url.startsWith("/");
}

/**
 * Resolves cart line thumbnails (presigned S3 URLs when needed).
 */
export function useCartLineThumbnails(
  items: CartLine[],
  products: Product[],
): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const itemSig = items
    .map((i) => `${i.key}:${i.productId}:${i.imageUrl ?? ""}`)
    .join("|");
  const productSig = products.map((p) => p.id).join(",");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!items.length) {
        if (!cancelled) setThumbnails({});
        return;
      }

      const byId = new Map(products.map((p) => [p.id, p]));
      const next: Record<string, string> = {};

      await Promise.all(
        items.map(async (item) => {
          const product = byId.get(item.productId);
          const ref =
            item.imageUrl ??
            (product ? productPrimaryImage(product) : undefined);
          if (!ref) return;

          let url = ref;
          if (!isBrowsableImageUrl(ref) || isStoragePath(ref)) {
            const resolved = await resolveImageUrl(ref);
            if (resolved) url = resolved;
          }

          if (isBrowsableImageUrl(url)) {
            next[item.key] = url;
          }
        }),
      );

      if (!cancelled) setThumbnails(next);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [itemSig, productSig, items, products]);

  return thumbnails;
}
