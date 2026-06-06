import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { cartLineImageRef } from "@/lib/cartLineImage";
import { resolveImageUrl } from "@/lib/productImageUrls";

const THUMB_PX = 96;

const frameClass =
  "size-24 max-h-24 max-w-24 shrink-0 flex-none self-start overflow-hidden border border-outline-variant/10 bg-black";

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
        className={`${frameClass} animate-pulse bg-surface-container`}
        aria-hidden
      />
    );
  }

  if (failed && !src) {
    return (
      <div
        className={`${frameClass} flex items-center justify-center bg-surface-container text-center text-label-sm text-on-surface-variant`}
        title="Image unavailable"
      >
        —
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={`${frameClass} flex items-center justify-center`}
        aria-hidden
      >
        <Icon
          name="image"
          className="text-2xl text-on-surface-variant opacity-40"
        />
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <img
        src={src}
        alt=""
        width={THUMB_PX}
        height={THUMB_PX}
        className="block h-full w-full max-h-full max-w-full object-cover object-center"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
