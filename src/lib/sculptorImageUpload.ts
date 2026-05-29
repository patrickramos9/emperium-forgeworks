import { uploadData } from "aws-amplify/storage";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

/** Uploads to S3 `sculptors/{slug}/…` and returns the storage path. */
export async function uploadSculptorLogo(slug: string, file: File): Promise<string> {
  const path = `sculptors/${slug}/${Date.now()}-${sanitizeFilename(file.name)}`;

  await uploadData({
    path,
    data: file,
    options: {
      contentType: file.type || "image/jpeg",
    },
  }).result;

  return path;
}
