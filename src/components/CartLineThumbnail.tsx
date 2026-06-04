import { useEffect, useState } from "react";
import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { ProductImage } from "@/components/ProductImage";
import { cartLineImageRef } from "@/lib/cartLineImage";
import { resolveImageUrl } from "@/lib/productImageUrls";

type Props = {
  item: CartLine;
  product?: Product;
  /** Catalog still loading — avoid showing empty placeholder too early. */
  catalogLoading?: boolean;
};

export function CartLineThumbnail({ item, product, catalogLoading }: Props) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  const refSig = `${item.key}:${item.imageUrl ?? ""}:${product?.id ?? ""}:${
    product?.imageRefs?.[0] ?? ""
  }:${product?.images?.[0] ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    async function load() {
      const ref = cartLineImageRef(item, product);
      if (!ref) {
        if (!cancelled) setSrc(undefined);
        return;
      }

      const url = await resolveImageUrl(ref);
      if (cancelled) return;

      if (url) {
        setSrc(url);
        return;
      }

      if (ref.startsWith("http") || ref.startsWith("/")) {
        setSrc(ref);
        return;
      }

      setSrc(undefined);
      setFailed(true);
      console.warn("[CartLineThumbnail] Could not resolve image for", ref);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refSig, item, product]);

  if (catalogLoading && !src) {
    return (
      <div
        className="h-24 w-24 shrink-0 self-start animate-pulse bg-surface-container"
        aria-hidden
      />
    );
  }

  if (failed && !src) {
    return (
      <div
        className="flex h-24 w-24 shrink-0 self-start items-center justify-center border border-outline-variant/20 bg-surface-container text-center text-label-sm text-on-surface-variant"
        title="Image unavailable"
      >
        —
      </div>
    );
  }

  return (
    <div className="h-24 w-24 shrink-0 self-start overflow-hidden border border-outline-variant/10 bg-black">
      <ProductImage
        src={src}
        alt=""
        className="h-full w-full"
        imageClassName="h-full w-full object-cover"
      />
    </div>
  );
}
