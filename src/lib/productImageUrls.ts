import { getUrl, type GetUrlWithPathInput } from "aws-amplify/storage";
import type { Product } from "@/data/seedProducts";
import { configureAmplify } from "@/lib/amplify";
import { getGuestStorageCredentialsProvider } from "@/lib/guestStorageCredentials";
import { isStoragePath, normalizeImageRef, normalizeImageRefs } from "@/lib/productImageRefs";

/** Resolve a stored path or legacy URL to a browser-loadable image URL. */
export async function resolveImageUrl(
  ref: string | undefined,
): Promise<string | undefined> {
  if (!ref?.trim()) return undefined;

  const path = normalizeImageRef(ref);
  if (!isStoragePath(path)) return ref;

  await configureAmplify();
  const guestCredentials = getGuestStorageCredentialsProvider();
  try {
    const input: GetUrlWithPathInput = guestCredentials
      ? ({
          path,
          options: { locationCredentialsProvider: guestCredentials },
        } as GetUrlWithPathInput)
      : { path };
    const { url } = await getUrl(input);
    return url.toString();
  } catch (err) {
    console.warn("[resolveImageUrl] Failed for", path, err);
    return undefined;
  }
}

export async function resolveProductImages(product: Product): Promise<Product> {
  const refs = normalizeImageRefs(product.images);
  const detailRef = product.detailImage
    ? normalizeImageRef(product.detailImage)
    : undefined;
  const detailImage = detailRef
    ? await resolveImageUrl(detailRef)
    : undefined;
  const imageResults = await Promise.allSettled(
    refs.map((img) => resolveImageUrl(img)),
  );
  const images = imageResults
    .filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === "fulfilled" && Boolean(result.value),
    )
    .map((result) => result.value);

  const imageRefs =
    refs.length > 0
      ? refs
      : detailRef
        ? [detailRef]
        : product.images.filter(Boolean);

  return {
    ...product,
    detailImage,
    imageRefs,
    images: images.length ? images : detailImage ? [detailImage] : [],
  };
}

export function productPrimaryImage(product: Product): string | undefined {
  return product.detailImage ?? product.images[0];
}
