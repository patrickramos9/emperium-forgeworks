import { uploadData, getUrl } from "aws-amplify/storage";
import { fetchAuthSession } from "aws-amplify/auth";

export const MESSAGE_IMAGE_MAX_COUNT = 4;
export const MESSAGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

async function resolveStorageIdentityId(): Promise<string> {
  const session = await fetchAuthSession();
  const identityId = session.identityId?.trim();
  if (!identityId) {
    throw new Error(
      "Could not resolve storage identity. Reload the page and try again.",
    );
  }
  return identityId;
}

export function assertMessageImageFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use JPEG, PNG, WebP, or GIF images only.");
  }
  if (file.size > MESSAGE_IMAGE_MAX_BYTES) {
    throw new Error("Each image must be 5 MB or smaller.");
  }
}

/** Upload a message photo to `message-attachments/{entity_id}/…`. */
export async function uploadMessageAttachment(file: File): Promise<string> {
  assertMessageImageFile(file);
  const identityId = await resolveStorageIdentityId();
  const path = `message-attachments/${identityId}/${Date.now()}-${sanitizeFilename(file.name)}`;

  await uploadData({
    path,
    data: file,
    options: {
      contentType: file.type || "image/jpeg",
    },
  }).result;

  return path;
}

export async function uploadMessageAttachments(
  files: File[],
): Promise<string[]> {
  if (files.length > MESSAGE_IMAGE_MAX_COUNT) {
    throw new Error(`Attach up to ${MESSAGE_IMAGE_MAX_COUNT} images.`);
  }
  const paths: string[] = [];
  for (const file of files) {
    paths.push(await uploadMessageAttachment(file));
  }
  return paths;
}

/** Presigned URL for a private message attachment path. */
export async function resolveMessageAttachmentUrl(
  path: string,
): Promise<string | undefined> {
  const trimmed = path.trim();
  if (!trimmed.startsWith("message-attachments/")) return undefined;
  try {
    const { url } = await getUrl({
      path: trimmed,
      options: { expiresIn: 3600 },
    });
    return url.toString();
  } catch (err) {
    console.warn("[resolveMessageAttachmentUrl] Failed for", trimmed, err);
    return undefined;
  }
}
