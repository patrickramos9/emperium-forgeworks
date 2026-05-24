import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ProductImage } from "@/components/ProductImage";

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  /** Resets carousel when the product changes. */
  resetKey?: string;
}

export function ProductImageGallery({
  images,
  alt,
  resetKey,
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = images.length > 1;
  const activeImage = images[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
  }, [resetKey]);

  function showPrevious() {
    setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }

  function showNext() {
    setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="space-y-3">
      <div
        className="group relative iron-bevel"
        tabIndex={hasMultiple ? 0 : undefined}
        onKeyDown={(e) => {
          if (!hasMultiple) return;
          if (e.key === "ArrowLeft") showPrevious();
          if (e.key === "ArrowRight") showNext();
        }}
      >
        <ProductImage
          src={activeImage}
          alt={`${alt} — photo ${activeIndex + 1}`}
          className="aspect-[4/5] bg-surface-container-low"
          imageClassName="contrast-125 grayscale-[0.2] transition-transform duration-500"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-black/70 text-on-surface opacity-100 transition-opacity hover:bg-black/90 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              aria-label="Previous photo"
            >
              <Icon name="chevron_left" />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-black/70 text-on-surface opacity-100 transition-opacity hover:bg-black/90 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              aria-label="Next photo"
            >
              <Icon name="chevron_right" />
            </button>
            <span className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 font-label-sm text-on-surface">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View photo ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={`relative h-16 w-16 shrink-0 overflow-hidden border bg-black iron-bevel transition-colors sm:h-20 sm:w-20 ${
                index === activeIndex
                  ? "border-primary ring-1 ring-primary"
                  : "border-outline-variant/30 opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={src}
                alt=""
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
