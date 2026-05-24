import { getUrl } from "aws-amplify/storage";
import type { Product } from "@/data/seedProducts";
import { configureAmplify } from "@/lib/amplify";
import { isStoragePath, normalizeImageRef } from "@/lib/productImageRefs";

/** Resolve a stored path or legacy URL to a browser-loadable image URL. */
export async function resolveImageUrl(
  ref: string | undefined,
): Promise<string | undefined> {
  if (!ref?.trim()) return undefined;

  const path = normalizeImageRef(ref);
  if (!isStoragePath(path)) return ref;

  await configureAmplify();
  const { url } = await getUrl({ path });
  return url.toString();
}

export async function resolveProductImages(product: Product): Promise<Product> {
  const detailImage = product.detailImage
    ? await resolveImageUrl(product.detailImage)
    : undefined;
  const images = (
    await Promise.all(product.images.map((img) => resolveImageUrl(img)))
  ).filter(Boolean) as string[];

  return {
    ...product,
    detailImage,
    images: images.length ? images : detailImage ? [detailImage] : [],
  };
}

export function productPrimaryImage(product: Product): string | undefined {
  return product.detailImage ?? product.images[0];
}
