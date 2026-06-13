import type { Product } from "@/data/seedProducts";
import { normalizeImageRef, normalizeImageRefs } from "@/lib/productImageRefs";
import type { ProductShippingDisplay } from "@/lib/shippingProfiles";
import { toProductShippingDisplayField } from "@/services/productShippingService";

import {
  serializeVariantGroups,
  type ProductOptionGroup,
} from "@/lib/productVariants";

/** AppSync AWSJSON inputs must be JSON strings, not raw objects/arrays. */
export function toJsonField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return JSON.stringify(value);
}

/** Parse AWSJSON from API responses (object or string). */
export function parseJsonField(raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export function normalizeSpecs(
  specs: Product["specs"] | null | undefined,
): Product["specs"] | null {
  if (!specs || Object.keys(specs).length === 0) return null;
  return specs;
}

export function normalizeStringArray(values: string[]): string[] | null {
  return values.length ? values : null;
}

export function buildProductMutationPayload(input: {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  lore?: string;
  category: string;
  priceCents: number;
  inStock: boolean;
  featured: boolean;
  sortOrder: number;
  vaultOnly?: boolean;
  shippingProfileId?: string;
  weightOz?: number;
  shippingDisplay?: ProductShippingDisplay | null;
  detailImage?: string;
  badges: string[];
  displayRating?: number | null;
  images: string[];
  variantGroups: ProductOptionGroup[];
  specs?: Product["specs"] | null;
}) {
  const detailImage = input.detailImage
    ? normalizeImageRef(input.detailImage)
    : undefined;
  const gallery = normalizeImageRefs(input.images);
  const images =
    gallery.length > 0 ? gallery : detailImage ? [detailImage] : [];

  return {
    slug: input.slug,
    title: input.title,
    category: input.category,
    priceCents: input.priceCents,
    inStock: input.inStock,
    featured: input.featured,
    sortOrder: input.sortOrder,
    vaultOnly: input.vaultOnly ?? false,
    ...(input.shippingProfileId?.trim()
      ? { shippingProfileId: input.shippingProfileId.trim() }
      : { shippingProfileId: null }),
    ...(input.weightOz != null && input.weightOz > 0
      ? { weightOz: input.weightOz }
      : { weightOz: null }),
    shippingDisplay: input.shippingDisplay
      ? toJsonField(toProductShippingDisplayField(input.shippingDisplay))
      : null,
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.lore ? { lore: input.lore } : {}),
    ...(detailImage ? { detailImage } : {}),
    badges: normalizeStringArray(input.badges),
    ...(input.displayRating != null &&
    input.displayRating >= 1 &&
    input.displayRating <= 5
      ? { displayRating: Math.round(input.displayRating) }
      : { displayRating: null }),
    images: normalizeStringArray(images),
    variants: toJsonField(serializeVariantGroups(input.variantGroups)),
    specs: toJsonField(normalizeSpecs(input.specs)),
  };
}
