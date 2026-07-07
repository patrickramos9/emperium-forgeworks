/** Google Merchant Center feed row helpers (M13). */

import type { Schema } from "../../amplify/data/resource";
import { buildPublicProductImageUrl } from "./publicProductImageUrl";
import { PRINT_SERVICE_CATALOG_SLUG } from "./printService";

export const MERCHANT_SITE_URL = "https://emperiumforgeworks.com";
export const MERCHANT_BRAND = "Emperium Forgeworks";

export const MERCHANT_FEED_HEADERS = [
  "id",
  "title",
  "description",
  "availability",
  "availability_date",
  "expiration_date",
  "link",
  "mobile_link",
  "image_link",
  "price",
  "sale_price",
  "sale_price_effective_date",
  "identifier_exists",
  "gtin",
  "mpn",
  "brand",
  "product_highlight",
  "product_detail",
  "additional_image_link",
  "condition",
  "adult",
  "color",
  "size",
  "size_type",
  "size_system",
  "gender",
  "material",
  "pattern",
  "age_group",
  "multipack",
  "is bundle",
  "unit_pricing_measure",
  "unit_pricing_base_measure",
  "energy_efficiency_class",
  "min_energy_efficiency_class",
  "max_energy_efficiency",
  "item_group_id",
  "video_link",
  "virtual_model_link",
  "cost_of_goods_sold",
] as const;

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function galleryRefs(row: Schema["Product"]["type"]): string[] {
  const gallery = (row.images ?? []).filter(Boolean) as string[];
  const detail = row.detailImage?.trim() ?? "";
  if (detail && !gallery.includes(detail)) return [detail, ...gallery];
  return gallery;
}

export function isMerchantListedProduct(row: Schema["Product"]["type"]): boolean {
  return !row.vaultOnly && row.slug !== PRINT_SERVICE_CATALOG_SLUG;
}

export function productToMerchantRow(
  product: Schema["Product"]["type"],
): Record<(typeof MERCHANT_FEED_HEADERS)[number], string> | null {
  const images = galleryRefs(product);
  const imageLink = images[0] ? buildPublicProductImageUrl(images[0]) : undefined;
  if (!imageLink) return null;

  const additionalImages = images
    .slice(1, 11)
    .map((ref) => buildPublicProductImageUrl(ref))
    .filter(Boolean)
    .join(",");

  const plainDescription = stripHtml(
    product.description?.trim() ||
      product.subtitle?.trim() ||
      product.title,
  ).slice(0, 5000);

  const highlights = [
    "Unpainted resin miniature",
    "High-resolution resin print",
    product.category ? `${product.category} collectible` : "Tabletop miniature",
  ]
    .map((h) => `"${h.replace(/"/g, '""')}"`)
    .join(", ");

  return {
    id: product.slug,
    title: product.title.trim(),
    description: plainDescription,
    availability: product.inStock === false ? "out_of_stock" : "in_stock",
    availability_date: "",
    expiration_date: "",
    link: `${MERCHANT_SITE_URL}/shop/${product.slug}`,
    mobile_link: "",
    image_link: imageLink,
    price: `${(product.priceCents / 100).toFixed(2)} USD`,
    sale_price: "",
    sale_price_effective_date: "",
    identifier_exists: "no",
    gtin: "",
    mpn: product.slug,
    brand: MERCHANT_BRAND,
    product_highlight: highlights,
    product_detail: product.category ? `Category: ${product.category}` : "",
    additional_image_link: additionalImages,
    condition: "new",
    adult: "no",
    color: "",
    size: "",
    size_type: "",
    size_system: "",
    gender: "",
    material: "Resin",
    pattern: "",
    age_group: "adult",
    multipack: "",
    "is bundle": "",
    unit_pricing_measure: "",
    unit_pricing_base_measure: "",
    energy_efficiency_class: "",
    min_energy_efficiency_class: "",
    max_energy_efficiency: "",
    item_group_id: "",
    video_link: "",
    virtual_model_link: "",
    cost_of_goods_sold: "",
  };
}

export function merchantRowToCsv(
  row: Record<(typeof MERCHANT_FEED_HEADERS)[number], string>,
): string {
  return MERCHANT_FEED_HEADERS.map((key) => escCsv(row[key])).join(",");
}
