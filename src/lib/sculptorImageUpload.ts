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

/** Uploads portfolio images to `sculptors/{slug}/gallery/…`. */
export async function uploadSculptorGalleryImage(
  slug: string,
  file: File,
): Promise<string> {
  const path = `sculptors/${slug}/gallery/${Date.now()}-${sanitizeFilename(file.name)}`;

  await uploadData({
    path,
    data: file,
    options: {
      contentType: file.type || "image/jpeg",
    },
  }).result;

  return path;
}

export async function uploadSculptorGalleryImages(
  slug: string,
  files: File[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    paths.push(await uploadSculptorGalleryImage(slug, file));
  }
  return paths;
}
