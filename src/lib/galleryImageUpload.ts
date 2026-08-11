import { uploadData } from "aws-amplify/storage";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

/** Uploads customer gallery photos to S3 `gallery/…`. */
export async function uploadGalleryImage(file: File): Promise<string> {
  const path = `gallery/${Date.now()}-${sanitizeFilename(file.name)}`;

  await uploadData({
    path,
    data: file,
    options: {
      contentType: file.type || "image/jpeg",
    },
  }).result;

  return path;
}
