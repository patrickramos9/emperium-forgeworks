import type { Product } from "@/data/seedProducts";
import { normalizeImageRef, normalizeImageRefs } from "@/lib/productImageRefs";

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
  detailImage?: string;
  badges: string[];
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
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.lore ? { lore: input.lore } : {}),
    ...(detailImage ? { detailImage } : {}),
    badges: normalizeStringArray(input.badges),
    images: normalizeStringArray(images),
    variants: toJsonField(serializeVariantGroups(input.variantGroups)),
    specs: toJsonField(normalizeSpecs(input.specs)),
  };
}
