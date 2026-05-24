import { normalizeImageRef } from "@/lib/productImageRefs";

/** Ordered carousel paths (storage paths or static URLs). */
export function productToGalleryImages(product: {
  images?: string[];
  detailImage?: string | null;
}): string[] {
  const gallery = (product.images ?? [])
    .map((img) => normalizeImageRef(img))
    .filter(Boolean);
  const detail = product.detailImage
    ? normalizeImageRef(product.detailImage)
    : "";
  if (detail && !gallery.includes(detail)) {
    return [detail, ...gallery];
  }
  return gallery;
}

export function galleryToProductImages(gallery: string[]): {
  images: string[];
  detailImage?: string;
} {
  const images = gallery.filter(Boolean);
  return {
    images,
    detailImage: images[0],
  };
}

export function moveGalleryImage(
  images: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= images.length
  ) {
    return images;
  }

  const next = [...images];
  const [item] = next.splice(fromIndex, 1);
  const clampedTo = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clampedTo, 0, item);
  return next;
}

export function insertGalleryImages(
  images: string[],
  paths: string[],
  index: number,
): string[] {
  const next = [...images];
  const clampedTo = Math.max(0, Math.min(index, next.length));
  next.splice(clampedTo, 0, ...paths);
  return next.slice(0, MAX_GALLERY_IMAGES);
}

export function removeGalleryImage(images: string[], index: number): string[] {
  return images.filter((_, i) => i !== index);
}

export const MAX_GALLERY_IMAGES = 10;

export const GALLERY_DRAG_TYPE = "application/x-emperium-gallery-index";
