import type { Product, ProductCategory } from "@/data/seedProducts";

/** Maps an Amplify Data Product record to the storefront Product shape. */
export function mapAmplifyProduct(row: {
  id: string;
  slug: string;
  title: string;
  detailImage?: string | null;
  subtitle?: string | null;
  description?: string | null;
  lore?: string | null;
  category: string;
  priceCents: number;
  badges?: (string | null)[] | null;
  images?: (string | null)[] | null;
  variants?: unknown;
  specs?: unknown;
  inStock?: boolean | null;
  featured?: boolean | null;
  sortOrder?: number | null;
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    detailImage: row.detailImage ?? undefined,
    subtitle: row.subtitle ?? undefined,
    description: row.description ?? undefined,
    lore: row.lore ?? undefined,
    category: row.category as ProductCategory,
    priceCents: row.priceCents,
    badges: (row.badges ?? []).filter(Boolean) as string[],
    images: (row.images ?? []).filter(Boolean) as string[],
    variants: (row.variants ?? []) as Product["variants"],
    specs: row.specs as Product["specs"],
    inStock: row.inStock ?? true,
    featured: row.featured ?? false,
    sortOrder: row.sortOrder ?? 0,
  };
}
