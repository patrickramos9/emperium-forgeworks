import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/data/seedProducts";
import { Icon } from "@/components/Icon";
import { productPrimaryImage } from "@/lib/productImageUrls";

const CAROUSEL_INTERVAL_MS = 5000;

const FEATURED_BOX_CLASS =
  "relative flex min-h-[320px] flex-col justify-end overflow-hidden bg-surface-container-low iron-bevel md:row-span-2 md:min-h-[480px]";

type FeaturedProductsCarouselProps = {
  products: Product[];
  loading?: boolean;
};

export function FeaturedProductsCarousel({
  products,
  loading = false,
}: FeaturedProductsCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [products]);

  useEffect(() => {
    if (loading || products.length <= 1 || paused) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % products.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [loading, products.length, paused]);

  if (loading) {
    return (
      <div className={FEATURED_BOX_CLASS}>
        <div className="flex min-h-[320px] flex-1 items-center justify-center md:min-h-[480px]">
          <p className="text-on-surface-variant">Loading featured products…</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={FEATURED_BOX_CLASS}>
        <div className="flex min-h-[320px] flex-1 items-center justify-center p-stack-lg text-center md:min-h-[480px]">
          <p className="text-on-surface-variant">
            Mark products as featured in admin to highlight them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={FEATURED_BOX_CLASS}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      {products.map((product, slideIndex) => {
        const imageSrc = productPrimaryImage(product);
        const isActive = slideIndex === index;

        return (
          <Link
            key={product.id}
            to={`/shop/${product.slug}`}
            aria-hidden={!isActive}
            tabIndex={isActive ? 0 : -1}
            className={`group absolute inset-0 flex flex-col justify-end transition-opacity duration-700 ${
              isActive
                ? "pointer-events-auto z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0"
            }`}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover grayscale brightness-75 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
              />
            ) : (
              <div className="absolute inset-0 bg-surface-container-high" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="relative z-10 p-stack-lg">
              <span className="font-label-sm uppercase tracking-widest text-secondary">
                {product.category}
              </span>
              <h3 className="mt-1 font-display-lg text-headline-lg uppercase text-on-surface">
                {product.title}
              </h3>
              <span className="mt-4 inline-flex items-center gap-1 font-label-md uppercase text-primary">
                View in the Vault
                <Icon name="arrow_forward" className="text-sm" />
              </span>
            </div>
          </Link>
        );
      })}

      {products.length > 1 && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex gap-1.5">
          {products.map((product, dotIndex) => (
            <span
              key={product.id}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                dotIndex === index ? "bg-primary" : "bg-on-surface/40"
              }`}
              aria-hidden
            />
          ))}
        </div>
      )}
    </div>
  );
}
