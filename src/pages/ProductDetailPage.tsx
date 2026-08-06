import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ProductImage } from "@/components/ProductImage";
import { RichTextContent } from "@/components/RichTextContent";
import { isRichTextEmpty } from "@/lib/richTextUtils";
import { QuantityStepper } from "@/components/QuantityStepper";
import { VariantPicker } from "@/components/VariantPicker";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/data/seedProducts";
import { productDisplayImages } from "@/lib/productDisplayImages";
import {
  displayUrlForGalleryRef,
  productGalleryRefs,
} from "@/lib/productGallery";
import { productPrimaryImage } from "@/lib/productImageUrls";
import {
  buildSelectedVariants,
  findGalleryIndexForImageRef,
  initialVariantMultiSelection,
  selectedVariantImageRef,
  toggleVariantMultiSelection,
} from "@/lib/productVariants";
import type { CatalogMode } from "@/lib/catalogFilter";
import { useProduct, useProducts } from "@/hooks/useProducts";
import { useProductShippingDisplay } from "@/hooks/useProductShippingDisplay";
import { ProductShippingInfo } from "@/components/ProductShippingInfo";
import { ProductFavoriteButton } from "@/components/ProductFavoriteButton";
import { ProductStarRating } from "@/components/ProductStarRating";
import { ReviewCard } from "@/components/ReviewCard";
import { StaleFavoriteNotice } from "@/components/StaleFavoriteNotice";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasReviewModel } from "@/lib/dataModels";
import { resolveProductStarRating } from "@/lib/reviewStats";
import {
  listApprovedReviewsForProduct,
  type ReviewRecord,
} from "@/services/reviewService";
import { isVaultUnlocked } from "@/lib/vaultSession";

type ProductDetailPageProps = {
  catalogMode?: CatalogMode;
  listPath?: string;
  listLabel?: string;
  productBasePath?: string;
  requiresVaultUnlock?: boolean;
};

export function ProductDetailPage({
  catalogMode = "public",
  listPath = "/shop",
  listLabel = "The Lair",
  productBasePath = "/shop",
  requiresVaultUnlock = false,
}: ProductDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const { product, loading } = useProduct(slug, catalogMode);
  const { products } = useProducts(catalogMode);
  const {
    shipping,
    loading: shippingLoading,
    error: shippingError,
  } = useProductShippingDisplay(product);
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [variantSelection, setVariantSelection] = useState<
    Record<string, string[]>
  >({});
  const [lastToggledOptionId, setLastToggledOptionId] = useState<
    string | undefined
  >();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [baseQuantity, setBaseQuantity] = useState(1);
  const [optionQuantities, setOptionQuantities] = useState<
    Record<string, number>
  >({});
  const [variantQuantities, setVariantQuantities] = useState<
    Record<string, number>
  >({});
  const [productReviews, setProductReviews] = useState<ReviewRecord[]>([]);

  useEffect(() => {
    if (!product?.slug) {
      setProductReviews([]);
      return;
    }

    let cancelled = false;
    const productSlug = product.slug;

    async function loadReviews() {
      const client = await getGuestDataClient();
      if (!client || !hasReviewModel(client)) {
        if (!cancelled) setProductReviews([]);
        return;
      }

      try {
        const rows = await listApprovedReviewsForProduct(client, productSlug);
        if (!cancelled) setProductReviews(rows);
      } catch {
        if (!cancelled) setProductReviews([]);
      }
    }

    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [product?.slug]);

  useEffect(() => {
    if (product) {
      setVariantSelection(initialVariantMultiSelection(product.variantGroups));
      setLastToggledOptionId(undefined);
      setGalleryIndex(0);
      setBaseQuantity(1);
      setOptionQuantities({});
      setVariantQuantities({});
    }
  }, [product?.slug, product?.variantGroups]);

  useEffect(() => {
    if (!product) return;
    const galleryRefs = productGalleryRefs(product);
    const imageRef = selectedVariantImageRef(
      product.variantGroups,
      variantSelection,
      lastToggledOptionId,
    );
    const index = findGalleryIndexForImageRef(galleryRefs, imageRef);
    if (index >= 0) setGalleryIndex(index);
  }, [product, variantSelection, lastToggledOptionId]);

  const activeGroups = useMemo(
    () =>
      product?.variantGroups.filter((group) => group.options.length > 0) ?? [],
    [product?.variantGroups],
  );

  const hasVariations = activeGroups.length > 0;

  const selectedVariants = useMemo(() => {
    if (!product) return [];
    return buildSelectedVariants(product.variantGroups, variantSelection);
  }, [product, variantSelection]);

  useEffect(() => {
    if (!product || selectedVariants.length === 0) return;
    setVariantQuantities((current) => {
      let changed = false;
      const next = { ...current };
      for (const variant of selectedVariants) {
        if (next[variant.id] == null) {
          next[variant.id] = 1;
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!selectedVariants.some((v) => v.id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [product, selectedVariants]);

  function handleVariantToggle(groupId: string, optionId: string) {
    setLastToggledOptionId(optionId);
    setVariantSelection((current) => {
      const selected = current[groupId]?.includes(optionId);
      if (!selected) {
        setOptionQuantities((qty) => ({
          ...qty,
          [optionId]: qty[optionId] ?? 1,
        }));
      }
      return toggleVariantMultiSelection(current, groupId, optionId);
    });
  }

  function resetVariantPickers() {
    if (!product) return;
    setVariantSelection(initialVariantMultiSelection(product.variantGroups));
    setLastToggledOptionId(undefined);
    setOptionQuantities({});
    setVariantQuantities({});
  }

  function showAddToast(
    title: string,
    totalCents: number,
    count: number,
    detail?: string,
  ) {
    const pieces = [formatPrice(totalCents)];
    if (count > 1) {
      pieces.push(`${count} item${count === 1 ? "" : "s"}`);
    }
    if (detail) {
      pieces.push(detail);
    }
    showToast({
      tone: "success",
      title,
      description: pieces.join(" · "),
      action: { label: "View cart", href: "/cart" },
    });
  }

  function handleAddToCart() {
    if (!product) return;
    if (!hasVariations) {
      const added = addItem(product, { quantity: baseQuantity });
      if (added) {
        showAddToast(
          `${product.title} added to cart`,
          product.priceCents * baseQuantity,
          baseQuantity,
        );
      }
      return;
    }
    let addedAny = false;
    let addedCount = 0;
    let addedTotalCents = 0;
    const addedLabels: string[] = [];
    if (activeGroups.length === 1) {
      const group = activeGroups[0]!;
      for (const optionId of variantSelection[group.id] ?? []) {
        const option = group.options.find((row) => row.id === optionId);
        if (!option) continue;
        const quantity = optionQuantities[option.id] ?? 1;
        const added = addItem(product, {
          variant: {
            id: option.id,
            label: option.label,
            priceDeltaCents: option.priceDeltaCents,
          },
          quantity,
        });
        addedAny = addedAny || added;
        if (added) {
          addedCount += quantity;
          addedTotalCents += (product.priceCents + option.priceDeltaCents) * quantity;
          addedLabels.push(option.label);
        }
      }
      if (addedAny) {
        const detail =
          addedLabels.length === 1
            ? addedLabels[0]
            : `${addedLabels[0]} +${addedLabels.length - 1} more`;
        showAddToast("Added to cart", addedTotalCents, addedCount, detail);
        resetVariantPickers();
      }
      return;
    }
    for (const variant of selectedVariants) {
      const quantity = variantQuantities[variant.id] ?? 1;
      const added = addItem(product, {
        variant,
        quantity,
      });
      addedAny = addedAny || added;
      if (added) {
        addedCount += quantity;
        addedTotalCents += (product.priceCents + variant.priceDeltaCents) * quantity;
        addedLabels.push(variant.label);
      }
    }
    if (addedAny) {
      const detail =
        addedLabels.length === 1
          ? addedLabels[0]
          : `${addedLabels[0]} +${addedLabels.length - 1} more`;
      showAddToast("Added to cart", addedTotalCents, addedCount, detail);
      resetVariantPickers();
    }
  }

  const addToCartCount = useMemo(() => {
    if (!hasVariations) return baseQuantity;
    if (activeGroups.length === 1) {
      const group = activeGroups[0]!;
      return (variantSelection[group.id] ?? []).reduce(
        (sum, optionId) => sum + (optionQuantities[optionId] ?? 1),
        0,
      );
    }
    return selectedVariants.reduce(
      (sum, variant) => sum + (variantQuantities[variant.id] ?? 1),
      0,
    );
  }, [
    hasVariations,
    baseQuantity,
    activeGroups,
    variantSelection,
    optionQuantities,
    selectedVariants,
    variantQuantities,
  ]);

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

  if (requiresVaultUnlock && !isVaultUnlocked()) {
    return (
      <main className="px-margin-mobile pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">The vault is sealed.</p>
        <Link to="/vault" className="mt-4 text-primary">
          Enter access key
        </Link>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="px-margin-mobile pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Product not found.</p>
        <StaleFavoriteNotice slug={slug} listPath={listPath} listLabel={listLabel} />
        <Link to={listPath} className="mt-4 inline-block text-primary">
          Back to {listLabel.toLowerCase()}
        </Link>
      </main>
    );
  }

  const canAddToCart =
    product.inStock && (!hasVariations || selectedVariants.length > 0);
  const addToCartHelper = !product.inStock
    ? "This item is currently out of stock."
    : hasVariations && selectedVariants.length === 0
      ? "Select at least one option to add this item."
      : null;
  const displayTitle = product.title.split("–")[0]?.trim() ?? product.title;
  const galleryImages = productDisplayImages(product);
  const starSummary = resolveProductStarRating(
    productReviews,
    product.displayRating,
  );
  const primaryBadge = product.badges[0];
  const related = products
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  return (
    <main className="pb-section-gap pt-24">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <nav className="mb-stack-lg flex items-center gap-2 font-label-sm uppercase text-on-surface-variant">
          <Link to={listPath} className="hover:text-primary">
            {listLabel}
          </Link>
          <Icon name="chevron_right" className="text-[14px]" />
          <Link
            to={`${listPath}?category=${encodeURIComponent(product.category)}`}
            className="hover:text-primary"
          >
            {product.category}
          </Link>
          <Icon name="chevron_right" className="text-[14px]" />
          <span className="text-on-surface">{displayTitle}</span>
        </nav>

        <div className="grid grid-cols-1 items-start gap-x-gutter gap-y-stack-sm lg:grid-cols-12">
          <ProductImageGallery
            images={galleryImages}
            alt={product.title}
            resetKey={product.slug}
            activeIndex={galleryIndex}
            onActiveIndexChange={setGalleryIndex}
            fitViewport
          >
            {({ main, thumbs }) => (
              <>
                <div className="order-1 lg:col-span-7 lg:row-start-1">
                  {main}
                </div>
                <div className="order-4 flex flex-col gap-stack-sm lg:col-span-7 lg:col-start-1 lg:row-start-2">
                  {thumbs}
                  {productReviews.length > 0 && (
                    <section aria-labelledby="product-reviews-heading">
                      <div className="mb-stack-md flex flex-wrap items-end justify-between gap-3 border-l-4 border-primary pl-4">
                        <div>
                          <h2
                            id="product-reviews-heading"
                            className="font-headline-md text-[18px] uppercase text-on-surface"
                          >
                            Customer Reviews
                          </h2>
                          <p className="mt-1 font-body-md text-on-surface-variant">
                            {productReviews.length === 1
                              ? "1 review for this piece."
                              : `${productReviews.length} reviews for this piece.`}
                          </p>
                        </div>
                        <Link
                          to="/reviews"
                          className="font-label-sm uppercase tracking-widest text-primary hover:text-plasma-glow"
                        >
                          All reviews
                        </Link>
                      </div>
                      <ul className="flex flex-col gap-stack-md">
                        {productReviews.map((review) => (
                          <li key={review.orderId}>
                            <ReviewCard review={review} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </>
            )}
          </ProductImageGallery>

          <div className="order-2 flex min-h-0 flex-col gap-stack-md lg:col-span-5 lg:row-start-1 lg:gap-stack-sm">
            <div className="shrink-0 space-y-stack-sm">
              {(primaryBadge || starSummary.rating != null) && (
                <div className="flex flex-wrap items-center gap-2">
                  {primaryBadge && (
                    <span
                      className={`px-2 py-0.5 font-label-sm uppercase tracking-widest ${
                        primaryBadge === "Popular"
                          ? "bg-blood-red text-white"
                          : "bg-primary text-on-primary"
                      }`}
                    >
                      {primaryBadge}
                    </span>
                  )}
                  {starSummary.rating != null && (
                    <ProductStarRating
                      rating={starSummary.rating}
                      reviewCount={
                        starSummary.fromReviews ? starSummary.reviewCount : 0
                      }
                    />
                  )}
                </div>
              )}
              <h1 className="font-display-lg text-headline-md uppercase leading-tight text-primary md:text-headline-lg">
                {displayTitle}
              </h1>
              {product.subtitle && (
                <p className="font-body-md italic text-on-surface-variant">
                  {product.subtitle}
                </p>
              )}
            </div>

            <div className="shrink-0 space-y-stack-sm">
              <p className="font-headline-md text-headline-md text-on-surface">
                {priceLabel}
              </p>

              <ProductShippingInfo
                shipping={shipping}
                loading={shippingLoading}
                emptyMessage={shippingError}
              />
            </div>

            <div className="space-y-stack-md">
              {activeGroups.length > 0 && (
                <VariantPicker
                  groups={activeGroups}
                  basePriceCents={product.priceCents}
                  selection={variantSelection}
                  quantities={optionQuantities}
                  resetKey={product.slug}
                  imageUrlForRef={(ref) => displayUrlForGalleryRef(product, ref)}
                  onToggle={handleVariantToggle}
                  onQuantityChange={(optionId, quantity) =>
                    setOptionQuantities((current) => ({
                      ...current,
                      [optionId]: quantity,
                    }))
                  }
                />
              )}

              {activeGroups.length > 1 && selectedVariants.length > 0 && (
                <div className="space-y-2 border border-outline-variant/30 bg-surface-container-low p-4">
                  <p className="font-label-sm uppercase text-on-surface-variant">
                    Quantities
                  </p>
                  <ul className="space-y-2">
                    {selectedVariants.map((variant) => (
                      <li
                        key={variant.id}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <span className="min-w-0 flex-1 font-label-md text-on-surface">
                          {variant.label}
                        </span>
                        <QuantityStepper
                          value={variantQuantities[variant.id] ?? 1}
                          onChange={(qty) =>
                            setVariantQuantities((current) => ({
                              ...current,
                              [variant.id]: qty,
                            }))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!hasVariations && (
                <div className="flex items-center justify-between gap-4 border border-outline-variant/30 bg-surface-container-low px-4 py-3">
                  <span className="font-label-md uppercase text-on-surface-variant">
                    Quantity
                  </span>
                  <QuantityStepper
                    value={baseQuantity}
                    onChange={setBaseQuantity}
                  />
                </div>
              )}

              {product.lore && (
                <div className="border-t border-outline-variant/20 pt-stack-md">
                  <h3 className="font-headline-md text-[18px] text-on-surface">
                    The Lore
                  </h3>
                  <p className="mt-stack-sm font-body-md leading-relaxed text-on-surface-variant">
                    {product.lore}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-stack-sm border-t border-outline-variant/20 pt-stack-sm">
              <button
                type="button"
                disabled={!canAddToCart}
                onClick={handleAddToCart}
                className="molten-glow flex w-full items-center justify-center gap-3 bg-primary py-4 font-headline-md uppercase tracking-wider text-on-primary transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              >
                <Icon name="add_shopping_cart" />
                {addToCartCount > 1
                  ? `Add ${addToCartCount} to Cart`
                  : "Add to Cart"}
              </button>
              {addToCartHelper && (
                <p className="text-body-sm text-on-surface-variant">{addToCartHelper}</p>
              )}
              <ProductFavoriteButton
                productId={product.id}
                productSlug={product.slug}
              />

              <div className="flex gap-gutter">
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

          {(product.specs || !isRichTextEmpty(product.description)) && (
            <div className="order-3 space-y-gutter lg:col-span-5 lg:col-start-8 lg:row-start-2">
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

              {!isRichTextEmpty(product.description) && (
                <div className="border border-outline-variant/10 bg-surface-container-high p-6 iron-bevel">
                  <h2 className="font-headline-md text-[18px] text-on-surface">
                    Description
                  </h2>
                  <RichTextContent
                    html={product.description}
                    className="mt-stack-md"
                  />
                </div>
              )}
            </div>
          )}
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
                to={listPath}
                className="flex items-center gap-1 font-label-md uppercase text-primary hover:text-plasma-glow"
              >
                View All
                <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <Link key={p.id} to={`${productBasePath}/${p.slug}`} className="group">
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
