import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/seedProducts";
import type { ProductVariant } from "@/data/seedProducts";
import { useProduct, useProducts } from "@/hooks/useProducts";

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { product, loading } = useProduct(slug);
  const { products } = useProducts();
  const { addItem } = useCart();
  const [variant, setVariant] = useState<ProductVariant | undefined>();

  if (loading) {
    return (
      <main className="px-margin-mobile pt-32 md:px-margin-desktop">
        Loading...
      </main>
    );
  }

  if (!product) {
    return (
      <main className="px-margin-mobile pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Product not found.</p>
        <Link to="/shop" className="mt-4 text-primary">
          Back to shop
        </Link>
      </main>
    );
  }

  const selectedVariant = variant ?? product.variants[0];
  const priceCents =
    product.priceCents + (selectedVariant?.priceDeltaCents ?? 0);
  const heroImage = product.detailImage ?? product.images[0];
  const displayTitle = product.title.split("–")[0]?.trim() ?? product.title;
  const related = products
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  return (
    <main className="pb-section-gap pt-24">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <nav className="mb-stack-lg flex items-center gap-2 font-label-sm uppercase text-on-surface-variant">
          <Link to="/shop" className="hover:text-primary">
            Shop
          </Link>
          <Icon name="chevron_right" className="text-[14px]" />
          <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-primary">
            {product.category}
          </Link>
          <Icon name="chevron_right" className="text-[14px]" />
          <span className="text-on-surface">{displayTitle}</span>
        </nav>

        <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
          <div className="space-y-gutter lg:col-span-7">
            <div className="group relative aspect-[4/5] overflow-hidden bg-surface-container-low iron-bevel">
              <img
                src={heroImage}
                alt={product.title}
                className="h-full w-full object-cover contrast-125 grayscale-[0.2] transition-transform duration-700 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </div>

            {product.specs && (
              <div className="grid grid-cols-3 gap-stack-sm font-label-sm">
                {product.specs.material && (
                  <div className="flex flex-col gap-1 border border-outline-variant/10 bg-surface-container-high p-4">
                    <span className="text-[10px] text-on-surface-variant">
                      MATERIAL
                    </span>
                    <span className="text-primary uppercase">
                      {product.specs.material}
                    </span>
                  </div>
                )}
                {product.specs.sculptor && (
                  <div className="flex flex-col gap-1 border border-outline-variant/10 bg-surface-container-high p-4">
                    <span className="text-[10px] text-on-surface-variant">
                      SCULPTOR
                    </span>
                    <span className="text-primary uppercase">
                      {product.specs.sculptor}
                    </span>
                  </div>
                )}
                {product.specs.status && (
                  <div className="flex flex-col gap-1 border border-outline-variant/10 bg-surface-container-high p-4">
                    <span className="text-[10px] text-on-surface-variant">
                      STATUS
                    </span>
                    <span className="text-plasma-glow uppercase">
                      {product.specs.status}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-stack-lg lg:sticky lg:top-32 lg:col-span-5">
            <div className="space-y-stack-sm">
              <div className="flex items-center gap-2">
                <span className="border border-secondary/20 bg-void-purple px-2 py-0.5 font-label-sm text-[10px] uppercase tracking-widest text-secondary">
                  Elite Selection
                </span>
                <div className="flex text-plasma-glow">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon key={i} name="star" className="text-sm" filled />
                  ))}
                </div>
              </div>
              <h1 className="font-display-lg text-display-lg uppercase leading-tight text-primary">
                {displayTitle}
              </h1>
              {product.subtitle && (
                <p className="font-body-lg italic text-on-surface-variant">
                  {product.subtitle}
                </p>
              )}
            </div>

            <p className="font-headline-lg text-headline-lg text-on-surface">
              {formatPrice(priceCents)}
            </p>

            {product.variants.length > 0 && (
              <div className="space-y-stack-md">
                <label className="font-label-md text-[12px] uppercase text-on-surface-variant">
                  Select Scale Variant
                </label>
                <div className="grid grid-cols-2 gap-stack-sm">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariant(v)}
                      className={
                        selectedVariant?.id === v.id
                          ? "molten-glow flex items-center justify-between border-2 border-primary bg-surface-container-highest px-4 py-3 font-label-md text-primary transition-all"
                          : "flex items-center justify-between border border-outline-variant/30 bg-surface-container px-4 py-3 font-label-md text-on-surface-variant transition-all hover:border-primary/50"
                      }
                    >
                      <span>{v.label} SCALE</span>
                      {selectedVariant?.id === v.id ? (
                        <Icon name="check_circle" className="text-sm" />
                      ) : v.priceDeltaCents > 0 ? (
                        <span className="text-[10px]">
                          +{formatPrice(v.priceDeltaCents)}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-stack-sm">
              <button
                type="button"
                disabled={!product.inStock}
                onClick={() =>
                  addItem(product, {
                    variant: selectedVariant,
                    quantity: 1,
                  })
                }
                className="molten-glow flex w-full items-center justify-center gap-3 bg-primary py-5 font-headline-md uppercase tracking-wider text-on-primary transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              >
                <Icon name="add_shopping_cart" />
                Add to Cart
              </button>
              <p className="text-center font-label-sm text-[10px] text-on-surface-variant/60">
                FORGED IN RESIN. SHIPS WITHIN 3-5 BUSINESS DAYS.
              </p>
            </div>

            {(product.lore || product.description) && (
              <div className="border-t border-outline-variant/20 pt-stack-lg">
                <h3 className="font-headline-md text-[18px] text-on-surface">
                  The Lore
                </h3>
                <p className="mt-stack-md font-body-md leading-relaxed text-on-surface-variant">
                  {product.lore ?? product.description}
                </p>
              </div>
            )}

            <div className="flex gap-gutter pt-stack-md">
              <div className="group flex items-center gap-2">
                <Icon
                  name="precision_manufacturing"
                  className="text-primary group-hover:text-plasma-glow"
                  filled
                />
                <span className="font-label-sm text-[11px] uppercase tracking-tighter">
                  Ultra-Fine Detail
                </span>
              </div>
              <div className="group flex items-center gap-2">
                <Icon
                  name="package_2"
                  className="text-primary group-hover:text-plasma-glow"
                  filled
                />
                <span className="font-label-sm text-[11px] uppercase tracking-tighter">
                  Secure Forged Packing
                </span>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-section-gap">
            <div className="mb-stack-lg flex items-end justify-between border-l-4 border-primary pl-4">
              <div>
                <h2 className="font-display-lg text-headline-lg uppercase text-on-surface">
                  You Might Also Like
                </h2>
                <p className="font-body-md text-on-surface-variant">
                  Expand your dark menagerie with these abominations.
                </p>
              </div>
              <Link
                to="/shop"
                className="flex items-center gap-1 font-label-md uppercase text-primary hover:text-plasma-glow"
              >
                View All
                <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <Link key={p.id} to={`/shop/${p.slug}`} className="group">
                  <div className="mb-stack-md aspect-[340/270] overflow-hidden bg-surface-container-low iron-bevel">
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="h-full w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100"
                    />
                  </div>
                  <h4 className="font-headline-md text-[18px] text-on-surface transition-colors group-hover:text-primary">
                    {p.title.split("–")[0]?.trim() ?? p.title}
                  </h4>
                  <p className="font-label-sm text-on-surface-variant">
                    {formatPrice(p.priceCents)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
