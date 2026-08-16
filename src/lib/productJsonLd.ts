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

function extraProperties(product: Product) {
  const properties: Array<{
    "@type": "PropertyValue";
    name: string;
    value: string;
  }> = [];
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

/** Schema.org Product JSON-LD for a public PDP (one Offer per variant). */
export function buildProductJsonLd(
  product: Product,
  origin: string,
): Record<string, unknown> {
  const site = origin.replace(/\/$/, "");
  const url = `${site}/shop/${product.slug}`;
  const images = absoluteProductImages(product);
  const description = stripHtml(
    product.description?.trim() || product.subtitle?.trim() || product.title,
  ).slice(0, 5000);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": url,
    name: product.title,
    description,
    sku: product.slug,
    mpn: product.slug,
    url,
    brand: { "@type": "Brand", name: MERCHANT_BRAND },
    category: product.category,
    offers: offersForProduct(product, url),
  };

  if (images.length === 1) data.image = images[0];
  else if (images.length > 1) data.image = images;

  if (product.specs?.material) data.material = product.specs.material;

  const extra = extraProperties(product);
  if (extra.length > 0) data.additionalProperty = extra;

  return data;
}
