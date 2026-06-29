import { uploadData } from "aws-amplify/storage";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  isPrintServiceUploadFile,
  printServiceUploadContentType,
} from "@/lib/printService";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

async function resolveStorageIdentityId(): Promise<string> {
  const session = await fetchAuthSession();
  const identityId = session.identityId?.trim();
  if (!identityId) {
    throw new Error("Could not resolve storage identity. Sign in and try again.");
  }
  return identityId;
}

/** Upload STL or ZIP to `print-jobs/{entity_id}/{uploadId}/…` (M21). */
export async function uploadPrintServiceStl(
  uploadId: string,
  file: File,
): Promise<string> {
  if (!isPrintServiceUploadFile(file)) {
    throw new Error("Only .stl or .zip files are accepted.");
  }

  const identityId = await resolveStorageIdentityId();
  const path = `print-jobs/${identityId}/${uploadId}/${sanitizeFilename(file.name)}`;

  await uploadData({
    path,
    data: file,
    options: {
      contentType: printServiceUploadContentType(file.name),
    },
  }).result;

  return path;
}

export function newPrintUploadId(): string {
  return crypto.randomUUID();
}
