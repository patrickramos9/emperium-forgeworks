import { uploadData, getUrl } from "aws-amplify/storage";
import type { PrintQuoteAttachment } from "@/lib/printRequest";

export const QUOTE_ATTACHMENT_MAX_COUNT = 5;
export const QUOTE_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".zip",
  ".txt",
]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 120);
}

function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function assertQuoteAttachmentFile(file: File): void {
  const type = (file.type || "").toLowerCase();
  const ext = fileExtension(file.name);
  const typeOk =
    ALLOWED_TYPES.has(type) ||
    type.startsWith("image/") ||
    ALLOWED_EXTENSIONS.has(ext);
  if (!typeOk) {
    throw new Error(
      "Use images, PDF, ZIP, or plain text files for quote attachments.",
    );
  }
  if (file.size > QUOTE_ATTACHMENT_MAX_BYTES) {
    throw new Error("Each attachment must be 15 MB or smaller.");
  }
}


/** Upload an admin quote attachment under print-quote-attachments/{printRequestId}/. */
export async function uploadPrintQuoteAttachment(
  printRequestId: string,
  file: File,
): Promise<PrintQuoteAttachment> {
  const id = printRequestId.trim();
  if (!id) throw new Error("Missing print request id.");
  assertQuoteAttachmentFile(file);

  const fileName = file.name.trim() || "attachment";
  const path = `print-quote-attachments/${id}/${Date.now()}-${sanitizeFilename(fileName)}`;
  const contentType = file.type || "application/octet-stream";

  await uploadData({
    path,
    data: file,
    options: { contentType },
  }).result;

  return {
    storagePath: path,
    fileName,
    contentType,
  };
}

export async function uploadPrintQuoteAttachments(
  printRequestId: string,
  files: File[],
): Promise<PrintQuoteAttachment[]> {
  if (files.length > QUOTE_ATTACHMENT_MAX_COUNT) {
    throw new Error(`Attach up to ${QUOTE_ATTACHMENT_MAX_COUNT} files.`);
  }
  const out: PrintQuoteAttachment[] = [];
  for (const file of files) {
    out.push(await uploadPrintQuoteAttachment(printRequestId, file));
  }
  return out;
}

export async function resolvePrintQuoteAttachmentUrl(
  path: string,
): Promise<string | undefined> {
  const trimmed = path.trim();
  if (!trimmed.startsWith("print-quote-attachments/")) return undefined;
  try {
    const { url } = await getUrl({
      path: trimmed,
      options: { expiresIn: 3600 },
    });
    return url.toString();
  } catch (err) {
    console.warn("[resolvePrintQuoteAttachmentUrl] Failed for", trimmed, err);
    return undefined;
  }
}
