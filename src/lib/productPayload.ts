import type { Product } from "@/data/seedProducts";

/** AppSync AWSJSON fields reject empty arrays; use null when empty. */
export function normalizeVariants(
  variants: Product["variants"] | null | undefined,
): Product["variants"] | null {
  if (!variants?.length) return null;
  return variants;
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
  detailImage?: string;
  badges: string[];
  images: string[];
  variants: Product["variants"] | null;
  specs?: Product["specs"] | null;
}) {
  return {
    slug: input.slug,
    title: input.title,
    category: input.category,
    priceCents: input.priceCents,
    inStock: input.inStock,
    featured: input.featured,
    sortOrder: input.sortOrder,
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.lore ? { lore: input.lore } : {}),
    ...(input.detailImage ? { detailImage: input.detailImage } : {}),
    badges: normalizeStringArray(input.badges),
    images: normalizeStringArray(input.images),
    variants: normalizeVariants(input.variants),
    specs: normalizeSpecs(input.specs),
  };
}
