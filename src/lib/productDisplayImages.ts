import {
  displayUrlForGalleryRef,
  productGalleryRefs,
} from "@/lib/productGallery";

/** Ordered images for storefront display (carousel / PDP). */
export function productDisplayImages(product: {
  images?: string[];
  imageRefs?: string[];
  detailImage?: string;
}): string[] {
  const refs = product.imageRefs ?? [];
  const urls = (product.images ?? []).filter(Boolean);
  if (refs.length > 0 && refs.length === urls.length) {
    return urls;
  }

  const galleryUrls = productGalleryRefs(product)
    .map((ref) => displayUrlForGalleryRef(product, ref))
    .filter((url): url is string => Boolean(url));
  if (galleryUrls.length > 0) return galleryUrls;

  if (urls.length > 0) return urls;
  return product.detailImage ? [product.detailImage] : [];
}
