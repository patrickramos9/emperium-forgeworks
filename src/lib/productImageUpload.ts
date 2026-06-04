import { uploadData } from "aws-amplify/storage";
import { configureAmplify } from "@/lib/amplify";
import { isAdminUser } from "@/lib/adminAuth";
import { normalizeProductSlug, validateProductSlug } from "@/lib/productSlug";

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
      "Your account must be in the admin group to upload product images.",
    );
  }
}

/** Uploads to S3 `products/{slug}/…` and returns the storage path for persistence. */
export async function uploadProductImage(
  slug: string,
  file: File,
): Promise<string> {
  const slugError = validateProductSlug(slug);
  if (slugError) {
    throw new Error(slugError);
  }

  await ensureAdminUploadSession();

  const safeSlug = normalizeProductSlug(slug);
  const path = `products/${safeSlug}/${Date.now()}-${sanitizeFilename(file.name)}`;

  await uploadData({
    path,
    data: file,
    options: {
      contentType: file.type || "image/jpeg",
    },
  }).result;

  return path;
}

/** Upload many files; returns storage paths in upload order. */
export async function uploadProductImages(
  slug: string,
  files: File[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    paths.push(await uploadProductImage(slug, file));
  }
  return paths;
}
