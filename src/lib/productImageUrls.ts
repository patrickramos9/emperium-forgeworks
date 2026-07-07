import type { Product } from "@/data/seedProducts";
import { productToGalleryImages } from "@/lib/productGallery";
import { isStoragePath, normalizeImageRef, normalizeImageRefs } from "@/lib/productImageRefs";
import { buildPublicProductImageUrl } from "@/lib/publicProductImageUrl";
import { getPublicCatalogImageUrl } from "@/lib/storefrontStorage";

/** Resolve a stored path or legacy URL to a browser-loadable image URL. */
export async function resolveImageUrl(
  ref: string | undefined,
): Promise<string | undefined> {
  if (!ref?.trim()) return undefined;

  const path = normalizeImageRef(ref);
  const publicUrl = buildPublicProductImageUrl(path);
  if (publicUrl) return publicUrl;

  if (!isStoragePath(path)) return ref;

  try {
    const url = await getPublicCatalogImageUrl(path);
    return url.toString();
  } catch (err) {
    console.warn("[resolveImageUrl] Failed for", path, err);
    return undefined;
  }
}

export async function resolveProductImages(product: Product): Promise<Product> {
  const galleryRefs = productToGalleryImages({
    images: normalizeImageRefs(product.images),
    detailImage: product.detailImage
      ? normalizeImageRef(product.detailImage)
      : undefined,
  });

  const imageResults = await Promise.allSettled(
    galleryRefs.map((ref) => resolveImageUrl(ref)),
  );

  const imageRefs: string[] = [];
  const images: string[] = [];
  for (let i = 0; i < galleryRefs.length; i++) {
    const result = imageResults[i];
    if (result?.status === "fulfilled" && result.value) {
      imageRefs.push(galleryRefs[i]!);
      images.push(result.value);
    }
  }

  return {
    ...product,
    detailImage: images[0],
    imageRefs,
    images,
  };
}

export function productPrimaryImage(product: Product): string | undefined {
  return product.detailImage ?? product.images[0];
}

/**
 * Raw image ref for presigning (storage path or URL). Prefer `imageRefs` when
 * `images` were cleared after a failed resolve.
 */
export function productPrimaryImageRef(product: Product): string | undefined {
  const ref = product.imageRefs?.[0];
  if (ref) return ref;
  const image = product.images[0];
  if (image) return image;
  return product.detailImage;
}
