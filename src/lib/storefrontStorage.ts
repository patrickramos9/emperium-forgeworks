/**
 * Public catalog assets under `products/*`.
 *
 * Requires storage rules for guest, authenticated, and customer group read
 * (see amplify/storage/resource.ts). Shoppers use the customer group IAM role
 * when signed in.
 *
 * @see docs/storage-auth.md
 */
import { getUrl } from "aws-amplify/storage";
import { configureAmplify } from "@/lib/amplify";

/** Presigned GET URL for a public catalog object. */
export async function getPublicCatalogImageUrl(path: string): Promise<URL> {
  await configureAmplify();
  const { url } = await getUrl({ path });
  return url;
}
