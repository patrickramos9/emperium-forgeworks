import {
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  parsePrintServiceJson,
  type PrintServiceLinePayload,
} from "./printService.js";

type OrderLineSnapshot = {
  printService?: PrintServiceLinePayload | null;
  printServiceJson?: string | null;
  [key: string]: unknown;
};

function parseLineItems(raw: unknown): OrderLineSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as OrderLineSnapshot[]) : [];
  } catch {
    return [];
  }
}

function printPayloadFromLine(line: OrderLineSnapshot): PrintServiceLinePayload | null {
  if (line.printService?.storagePath) return line.printService;
  return parsePrintServiceJson(line.printServiceJson);
}

export async function purgePrintJobFilesForOrder(order: {
  lineItems?: unknown;
}): Promise<{ purgedPaths: string[]; updatedLineItemsJson: string | null }> {
  const bucket = process.env.STORAGE_BUCKET_NAME?.trim();
  const lines = parseLineItems(order.lineItems);
  if (!lines.length) {
    return { purgedPaths: [], updatedLineItemsJson: null };
  }

  const now = new Date().toISOString();
  let changed = false;
  const purgedPaths: string[] = [];
  const client = bucket ? new S3Client({}) : null;

  const nextLines = await Promise.all(
    lines.map(async (line) => {
      const payload = printPayloadFromLine(line);
      if (!payload?.storagePath || payload.filePurgedAt) {
        return line;
      }

      if (client && bucket) {
        try {
          await client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: payload.storagePath,
            }),
          );
          purgedPaths.push(payload.storagePath);
        } catch (err) {
          console.error("Failed to purge print job file", payload.storagePath, err);
        }
      }

      changed = true;
      const updatedPayload = { ...payload, filePurgedAt: now };
      return {
        ...line,
        printService: updatedPayload,
        printServiceJson: JSON.stringify(updatedPayload),
        variantLabel:
          line.variantLabel ??
          [payload.sizeLabel, payload.resinTypeLabel, payload.resinColorLabel]
            .filter(Boolean)
            .join(" · "),
      };
    }),
  );

  return {
    purgedPaths,
    updatedLineItemsJson: changed ? JSON.stringify(nextLines) : null,
  };
}
