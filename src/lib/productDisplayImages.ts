/** Ordered images for storefront display (carousel / PDP). */
export function productDisplayImages(product: {
  images?: string[];
  detailImage?: string;
}): string[] {
  const gallery = (product.images ?? []).filter(Boolean);
  if (gallery.length > 0) return gallery;
  return product.detailImage ? [product.detailImage] : [];
}
