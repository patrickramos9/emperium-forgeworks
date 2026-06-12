import { uploadData } from "aws-amplify/storage";
import { configureAmplify } from "@/lib/amplify";
import { isAdminUser } from "@/lib/adminAuth";

export const MAX_REVIEW_IMAGES = 5;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

async function ensureAdminUploadSession(): Promise<void> {
  const configured = await configureAmplify();
  if (!configured) {
    throw new Error(
      "Storage is not configured. Redeploy the backend or refresh amplify_outputs.json.",
    );
  }

  const { fetchAuthSession, getCurrentUser } = await import("aws-amplify/auth");
  try {
    await getCurrentUser();
  } catch {
    throw new Error("Sign in to the admin portal before uploading images.");
  }

  const session = await fetchAuthSession();
  if (!session.credentials) {
    throw new Error(
      "Upload credentials unavailable. Sign out and sign in again as admin.",
    );
  }

  if (!(await isAdminUser())) {
    throw new Error(
      "Your account must be in the admin group to upload review images.",
    );
  }
}

/** Uploads customer photos to S3 `reviews/{reviewId}/…` and returns storage paths. */
export async function uploadReviewImages(
  reviewId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];
  if (files.length > MAX_REVIEW_IMAGES) {
    throw new Error(`Maximum ${MAX_REVIEW_IMAGES} photos per review.`);
  }

  await ensureAdminUploadSession();

  const paths: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files can be uploaded.");
    }
    const path = `reviews/${reviewId}/${Date.now()}-${sanitizeFilename(file.name)}`;
    await uploadData({
      path,
      data: file,
      options: {
        contentType: file.type || "image/jpeg",
      },
    }).result;
    paths.push(path);
  }

  return paths;
}
