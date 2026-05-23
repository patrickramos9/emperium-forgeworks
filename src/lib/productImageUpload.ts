import { getUrl, uploadData } from "aws-amplify/storage";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

/** Uploads to S3 `products/{slug}/…` and returns a signed GET URL for display. */
export async function uploadProductImage(
  slug: string,
  file: File,
): Promise<string> {
  const path = `products/${slug}/${Date.now()}-${sanitizeFilename(file.name)}`;

  await uploadData({
    path,
    data: file,
    options: {
      contentType: file.type || "image/jpeg",
    },
  }).result;

  const { url } = await getUrl({ path });
  return url.toString();
}
