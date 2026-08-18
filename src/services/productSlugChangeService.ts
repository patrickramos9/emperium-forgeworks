import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { hasGalleryEntryModel } from "@/lib/dataModels";
import { listAllProducts } from "@/lib/listAllProducts";
import { listAllGalleryEntries, updateGalleryEntry } from "@/services/galleryService";
import { listAllReviews, setReviewProductSlug } from "@/services/reviewService";

/** Meta catalog `id` / Pixel `content_ids` max length. */
export const META_CONTENT_ID_MAX_LENGTH = 100;

export async function assertProductSlugAvailable(
  client: AmplifyDataClient,
  slug: string,
  exceptProductId?: string,
): Promise<void> {
  const products = await listAllProducts(client);
  const taken = products.find(
    (product) =>
      product.slug.trim().toLowerCase() === slug &&
      product.id !== exceptProductId,
  );
  if (taken) {
    throw new Error(`Slug "${slug}" is already used by ${taken.title}.`);
  }
}

/** Keep reviews and gallery linked when a catalog slug changes. */
export async function retargetProductSlugRefs(
  client: AmplifyDataClient,
  fromSlug: string,
  toSlug: string,
): Promise<void> {
  if (!fromSlug || fromSlug === toSlug) return;

  const reviews = await listAllReviews(client);
  for (const review of reviews) {
    if (review.productSlug?.trim() !== fromSlug) continue;
    await setReviewProductSlug(client, review.orderId, toSlug);
  }

  if (!hasGalleryEntryModel(client)) return;
  const entries = await listAllGalleryEntries(client);
  for (const entry of entries) {
    if (entry.productSlug.trim() !== fromSlug) continue;
    await updateGalleryEntry(client, entry.id, { productSlug: toSlug });
  }
}
