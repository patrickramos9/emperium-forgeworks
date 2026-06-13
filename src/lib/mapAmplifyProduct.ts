import type { Product, ProductCategory } from "@/data/seedProducts";
import { parseJsonField } from "@/lib/productPayload";
import {
  flattenVariantGroups,
  parseVariantGroups,
} from "@/lib/productVariants";

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
  displayRating?: number | null;
  images?: (string | null)[] | null;
  variants?: unknown;
  specs?: unknown;
  inStock?: boolean | null;
  featured?: boolean | null;
  sortOrder?: number | null;
  vaultOnly?: boolean | null;
  shippingProfileId?: string | null;
  weightOz?: number | null;
  shippingDisplay?: unknown;
}): Product {
  const gallery = (row.images ?? []).filter(Boolean) as string[];
  const detailImage = row.detailImage ?? undefined;
  const images =
    gallery.length > 0 ? gallery : detailImage ? [detailImage] : [];

  const variantGroups = parseVariantGroups(row.variants);
  const variants = flattenVariantGroups(variantGroups);
  const specsRaw = parseJsonField(row.specs);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    detailImage,
    subtitle: row.subtitle ?? undefined,
    description: row.description ?? undefined,
    lore: row.lore ?? undefined,
    category: row.category as ProductCategory,
    priceCents: row.priceCents,
    badges: (row.badges ?? []).filter(Boolean) as string[],
    displayRating:
      row.displayRating != null &&
      row.displayRating >= 1 &&
      row.displayRating <= 5
        ? row.displayRating
        : undefined,
    images,
    variantGroups,
    variants,
    specs: specsRaw as Product["specs"],
    inStock: row.inStock ?? true,
    featured: row.featured ?? false,
    sortOrder: row.sortOrder ?? 0,
    vaultOnly: row.vaultOnly ?? false,
    shippingProfileId: row.shippingProfileId ?? undefined,
    weightOz: row.weightOz ?? undefined,
    shippingDisplay: row.shippingDisplay ?? undefined,
  };
}
