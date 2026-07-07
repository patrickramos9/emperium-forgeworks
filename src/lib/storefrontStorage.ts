/**
 * Public catalog assets under `products/*`.
 *
 * Catalog images use stable public S3 URLs (M13) for products/*.
 * Other prefixes still use presigned GET via Amplify Storage.
 *
 * @see docs/storage-auth.md
 * @see docs/merchant-center-feed.md
 */
import { getUrl } from "aws-amplify/storage";
import { configureAmplify } from "@/lib/amplify";
import { isStoragePath, normalizeImageRef } from "@/lib/productImageRefs";
import { buildPublicProductImageUrl } from "@/lib/publicProductImageUrl";

/** URL for a catalog object (public products/* or presigned for other prefixes). */
export async function getPublicCatalogImageUrl(path: string): Promise<URL> {
  const normalized = normalizeImageRef(path);
  const publicUrl = buildPublicProductImageUrl(normalized);
  if (publicUrl) return new URL(publicUrl);

  if (!isStoragePath(normalized)) {
    throw new Error(`Not a storage path: ${path}`);
  }

  await configureAmplify();
  const { url } = await getUrl({ path: normalized });
  return url;
}
