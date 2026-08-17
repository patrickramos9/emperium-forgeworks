import type { Product } from "@/data/seedProducts";
import type { CatalogMode } from "@/lib/catalogFilter";
import { MERCHANT_BRAND, stripHtml } from "@/lib/merchantFeed";
import { isPrintServiceCatalogSlug } from "@/lib/printService";
import { displayUrlForGalleryRef, productGalleryRefs } from "@/lib/productGallery";
import { flattenVariantGroups } from "@/lib/productVariants";
import { resolveCatalogImageUrl } from "@/lib/publicProductImageUrl";

const SCHEMA_IN_STOCK = "https://schema.org/InStock";
const SCHEMA_OUT_OF_STOCK = "https://schema.org/OutOfStock";
const SCHEMA_NEW = "https://schema.org/NewCondition";

type JsonLdOffer = {
  "@type": "Offer";
  name?: string;
  sku: string;
  url: string;
  price: string;
  priceCurrency: "USD";
  availability: string;
  itemCondition: string;
};

export function shouldEmitProductJsonLd(
  product: Product,
  catalogMode: CatalogMode,
): boolean {
  return (
    catalogMode === "public" &&
    !product.vaultOnly &&
    !isPrintServiceCatalogSlug(product.slug)
  );
}

/** Public PDP path — Meta PageView waits for product microdata on these routes. */
export function isPublicProductPath(pathname: string): boolean {
  return /^\/shop\/[^/]+\/?$/.test(pathname);
}

function formatOfferPrice(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function absoluteProductImages(product: Product): string[] {
  const seen = new Set<string>();
  const images: string[] = [];

  const add = (url: string | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed) || seen.has(trimmed)) return;
    seen.add(trimmed);
    images.push(trimmed);
  };

  for (const ref of productGalleryRefs(product)) {
    add(resolveCatalogImageUrl(ref));
    add(displayUrlForGalleryRef(product, ref));
  }
  for (const image of product.images ?? []) add(image);
  add(product.detailImage);

  return images;
}

function offersForProduct(product: Product, productUrl: string): JsonLdOffer[] {
  const availability = product.inStock ? SCHEMA_IN_STOCK : SCHEMA_OUT_OF_STOCK;
  const base = {
    "@type": "Offer" as const,
    url: productUrl,
    priceCurrency: "USD" as const,
    availability,
    itemCondition: SCHEMA_NEW,
  };

  const variants =
    product.variants.length > 0
      ? product.variants
      : flattenVariantGroups(product.variantGroups).filter((row) =>
          row.label.trim(),
        );

  if (variants.length === 0) {
    return [
      {
        ...base,
        sku: product.slug,
        price: formatOfferPrice(product.priceCents),
      },
    ];
  }

  return variants.map((variant) => ({
    ...base,
    name: variant.label,
    sku: `${product.slug}:${variant.id}`,
    price: formatOfferPrice(product.priceCents + variant.priceDeltaCents),
  }));
}

function extraProperties(product: Product, hasVariants: boolean) {
  const properties: Array<{
    "@type": "PropertyValue";
    name?: string;
    propertyID?: string;
    value: string;
  }> = [];
  if (hasVariants) {
    properties.push({
      "@type": "PropertyValue",
      propertyID: "item_group_id",
      value: product.slug,
    });
  }
  if (product.specs?.sculptor) {
    properties.push({
      "@type": "PropertyValue",
      name: "Sculptor",
      value: product.specs.sculptor,
    });
  }
  if (product.specs?.status) {
    properties.push({
      "@type": "PropertyValue",
      name: "Status",
      value: product.specs.status,
    });
  }
  return properties;
}

function productDescription(product: Product): string {
  return stripHtml(
    product.description?.trim() || product.subtitle?.trim() || product.title,
  )
    .replace(/\s+/g, " ")
    .slice(0, 5000);
}

function listingPriceCents(product: Product): number {
  const variants =
    product.variants.length > 0
      ? product.variants
      : flattenVariantGroups(product.variantGroups).filter((row) =>
          row.label.trim(),
        );
  if (variants.length === 0) return product.priceCents;
  return Math.min(
    ...variants.map((row) => product.priceCents + row.priceDeltaCents),
    product.priceCents,
  );
}

/** Open Graph + product:* tags Meta’s pixel catalog ingest reads from <head>. */
export function buildProductOpenGraph(
  product: Product,
  origin: string,
): Record<string, string> {
  const site = origin.replace(/\/$/, "");
  const url = `${site}/shop/${product.slug}`;
  const images = absoluteProductImages(product);
  const hasVariants =
    product.variants.length > 0 ||
    flattenVariantGroups(product.variantGroups).some((row) => row.label.trim());

  const tags: Record<string, string> = {
    "og:type": "product",
    "og:title": product.title,
    "og:description": productDescription(product).slice(0, 500),
    "og:url": url,
    "product:brand": MERCHANT_BRAND,
    "product:availability": product.inStock ? "in stock" : "out of stock",
    "product:condition": "new",
    "product:price:amount": formatOfferPrice(listingPriceCents(product)),
    "product:price:currency": "USD",
    "product:retailer_item_id": product.slug,
  };
  if (images[0]) tags["og:image"] = images[0];
  if (hasVariants) tags["product:item_group_id"] = product.slug;
  return tags;
}

/** Schema.org Product JSON-LD for a public PDP (one Offer per variant). */
export function buildProductJsonLd(
  product: Product,
  origin: string,
): Record<string, unknown> {
  const site = origin.replace(/\/$/, "");
  const url = `${site}/shop/${product.slug}`;
  const images = absoluteProductImages(product);
  const description = productDescription(product);
  const offers = offersForProduct(product, url);
  const hasVariants = offers.length > 1 || Boolean(offers[0]?.name);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": url,
    name: product.title,
    description,
    productID: product.slug,
    sku: product.slug,
    mpn: product.slug,
    url,
    brand: MERCHANT_BRAND,
    category: product.category,
    offers,
  };

  if (images.length === 1) data.image = images[0];
  else if (images.length > 1) data.image = images;

  if (product.specs?.material) data.material = product.specs.material;

  const extra = extraProperties(product, hasVariants);
  if (extra.length > 0) data.additionalProperty = extra;

  return data;
}
