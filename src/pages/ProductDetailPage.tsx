import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ProductImage } from "@/components/ProductImage";
import { VariantPicker } from "@/components/VariantPicker";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/seedProducts";
import { productDisplayImages } from "@/lib/productDisplayImages";
import { productPrimaryImage } from "@/lib/productImageUrls";
import {
  buildSelectedVariants,
  findGalleryIndexForImageRef,
  initialVariantMultiSelection,
  selectedVariantImageRef,
  toggleVariantMultiSelection,
} from "@/lib/productVariants";
import { useProduct, useProducts } from "@/hooks/useProducts";

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { product, loading } = useProduct(slug);
  const { products } = useProducts();
  const { addItem } = useCart();
  const [variantSelection, setVariantSelection] = useState<
    Record<string, string[]>
  >({});
  const [lastToggledOptionId, setLastToggledOptionId] = useState<
    string | undefined
  >();
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (product) {
      setVariantSelection(initialVariantMultiSelection(product.variantGroups));
      setLastToggledOptionId(undefined);
      setGalleryIndex(0);
    }
  }, [product?.slug, product?.variantGroups]);

  useEffect(() => {
    if (!product) return;
    const refs = product.imageRefs ?? product.images;
    const imageRef = selectedVariantImageRef(
      product.variantGroups,
      variantSelection,
      lastToggledOptionId,
    );
    const index = findGalleryIndexForImageRef(refs, imageRef);
    if (index >= 0) setGalleryIndex(index);
  }, [product, variantSelection, lastToggledOptionId]);

  const activeGroups = useMemo(
    () =>
      product?.variantGroups.filter((group) => group.options.length > 0) ?? [],
    [product?.variantGroups],
  );

  const selectedVariants = useMemo(() => {
    if (!product) return [];
    return buildSelectedVariants(product.variantGroups, variantSelection);
  }, [product, variantSelection]);

  const priceLabel = useMemo(() => {
    if (!product) return "";
    if (selectedVariants.length === 0) return formatPrice(product.priceCents);
    const totalCents = selectedVariants.reduce(
      (sum, variant) => sum + product.priceCents + variant.priceDeltaCents,
      0,
    );
    return formatPrice(totalCents);
  }, [product, selectedVariants]);

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

  const hasVariations = activeGroups.length > 0;
  const canAddToCart =
    product.inStock && (!hasVariations || selectedVariants.length > 0);
  const displayTitle = product.title.split("–")[0]?.trim() ?? product.title;
  const galleryImages = productDisplayImages(product);
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
            <ProductImageGallery
              images={galleryImages}
              alt={product.title}
              resetKey={product.slug}
              activeIndex={galleryIndex}
              onActiveIndexChange={setGalleryIndex}
            />

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

            {product.description && (
              <div className="border border-outline-variant/10 bg-surface-container-high p-6 iron-bevel">
                <h2 className="font-headline-md text-[18px] text-on-surface">
                  Description
                </h2>
                <p className="mt-stack-md font-body-md leading-relaxed text-on-surface-variant">
                  {product.description}
                </p>
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
              {priceLabel}
            </p>

            {activeGroups.length > 0 && (
              <VariantPicker
                groups={activeGroups}
                basePriceCents={product.priceCents}
                selection={variantSelection}
                resetKey={product.slug}
                onToggle={(groupId, optionId) => {
                  setLastToggledOptionId(optionId);
                  setVariantSelection((current) =>
                    toggleVariantMultiSelection(current, groupId, optionId),
                  );
                }}
              />
            )}
            <div className="space-y-stack-sm">
              <button
                type="button"
                disabled={!canAddToCart}
                onClick={() => {
                  if (!hasVariations) {
                    addItem(product, { quantity: 1 });
                    return;
                  }
                  for (const variant of selectedVariants) {
                    addItem(product, { variant, quantity: 1 });
                  }
                }}
                className="molten-glow flex w-full items-center justify-center gap-3 bg-primary py-5 font-headline-md uppercase tracking-wider text-on-primary transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              >
                <Icon name="add_shopping_cart" />
                {selectedVariants.length > 1
                  ? `Add ${selectedVariants.length} to Cart`
                  : "Add to Cart"}
              </button>
              <p className="text-center font-label-sm text-[10px] text-on-surface-variant/60">
                FORGED IN RESIN. SHIPS WITHIN 3-5 BUSINESS DAYS.
              </p>
            </div>

            {product.lore && (
              <div className="border-t border-outline-variant/20 pt-stack-lg">
                <h3 className="font-headline-md text-[18px] text-on-surface">
                  The Lore
                </h3>
                <p className="mt-stack-md font-body-md leading-relaxed text-on-surface-variant">
                  {product.lore}
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
                  <ProductImage
                    src={productPrimaryImage(p)}
                    alt={p.title}
                    className="mb-stack-md aspect-[340/270] bg-surface-container-low iron-bevel"
                    imageClassName="opacity-80 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100"
                  />
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
