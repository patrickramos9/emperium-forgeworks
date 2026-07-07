import type { Schema } from "../../data/resource";
import {
  effectivePrintReviewStatus,
  parsePrintServiceJson,
  type PrintReviewStatus,
  type PrintServiceLinePayload,
} from "./printService.js";
import { refundableCentsRemaining } from "./refunds.js";

type OrderRow = Schema["Order"]["type"];

export type OrderLineSnapshot = {
  productId?: string;
  quantity?: number;
  priceCents?: number;
  printService?: PrintServiceLinePayload | null;
  printServiceJson?: string | null;
  variantLabel?: string;
  [key: string]: unknown;
};

export function parseOrderLineItems(raw: unknown): OrderLineSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as OrderLineSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function printPayloadFromLine(
  line: OrderLineSnapshot,
): PrintServiceLinePayload | null {
  if (line.printService?.storagePath) return line.printService;
  return parsePrintServiceJson(line.printServiceJson);
}

export function orderHasPendingPrintReview(lines: OrderLineSnapshot[]): boolean {
  return lines.some((line) => {
    const payload = printPayloadFromLine(line);
    return payload && effectivePrintReviewStatus(payload) === "pending_review";
  });
}

export function assertPrintReviewAllowsFulfillment(
  order: OrderRow,
  targetStatus: string,
): void {
  if (targetStatus !== "processing") return;
  const lines = parseOrderLineItems(order.lineItems);
  if (orderHasPendingPrintReview(lines)) {
    throw new Error(
      "Approve all uploaded print files before marking this order as Processing.",
    );
  }
}

export function findPrintLineByUploadId(
  lines: OrderLineSnapshot[],
  uploadId: string,
): { line: OrderLineSnapshot; index: number; payload: PrintServiceLinePayload } | null {
  const trimmed = uploadId.trim();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const payload = printPayloadFromLine(line);
    if (payload?.uploadId === trimmed) {
      return { line, index, payload };
    }
  }
  return null;
}

export function applyPrintLineReview(
  lines: OrderLineSnapshot[],
  uploadId: string,
  reviewStatus: PrintReviewStatus,
  reviewNotes?: string,
): OrderLineSnapshot[] {
  const match = findPrintLineByUploadId(lines, uploadId);
  if (!match) {
    throw new Error("Print line not found on this order.");
  }

  const current = effectivePrintReviewStatus(match.payload);
  if (current !== "pending_review") {
    throw new Error("This print file has already been reviewed.");
  }

  const reviewedAt = new Date().toISOString();
  const updatedPayload: PrintServiceLinePayload = {
    ...match.payload,
    reviewStatus,
    reviewedAt,
    ...(reviewNotes?.trim() ? { reviewNotes: reviewNotes.trim() } : {}),
  };

  return lines.map((line, index) => {
    if (index !== match.index) return line;
    return {
      ...line,
      printService: updatedPayload,
      printServiceJson: JSON.stringify(updatedPayload),
      variantLabel:
        line.variantLabel ??
        [updatedPayload.sizeLabel, updatedPayload.resinTypeLabel, updatedPayload.resinColorLabel]
          .filter(Boolean)
          .join(" · "),
    };
  });
}

export function isPrintOnlyOrder(lines: OrderLineSnapshot[]): boolean {
  if (!lines.length) return false;
  return lines.every((line) => Boolean(printPayloadFromLine(line)));
}

export function computePrintRejectRefundCents(
  order: OrderRow,
  lines: OrderLineSnapshot[],
  uploadId: string,
): number {
  const remaining = refundableCentsRemaining(order);
  if (remaining <= 0) {
    throw new Error("This order has no refundable balance remaining.");
  }

  if (isPrintOnlyOrder(lines)) {
    return remaining;
  }

  const match = findPrintLineByUploadId(lines, uploadId);
  if (!match) {
    throw new Error("Print line not found on this order.");
  }

  const quantity = match.line.quantity ?? 1;
  const lineTotal = (match.line.priceCents ?? 0) * quantity;
  if (lineTotal <= 0) {
    return remaining;
  }

  return Math.min(lineTotal, remaining);
}

type NotificationClient = {
  models: {
    Notification: {
      create: (input: {
        title: string;
        body: string;
        kind: "order";
        userId: string;
        active: boolean;
        sortOrder: number;
      }) => Promise<{ errors?: { message: string }[] | null }>;
    };
  };
};

export async function createPrintReviewNotification(
  client: NotificationClient,
  order: OrderRow,
  reviewStatus: PrintReviewStatus,
  fileName: string,
  reviewNotes?: string,
): Promise<boolean> {
  const userId = order.userId?.trim();
  if (!userId) return false;

  const siteUrl = (process.env.SITE_URL ?? "https://emperiumforgeworks.com").replace(
    /\/$/,
    "",
  );
  const orderDetailUrl = `${siteUrl}/account/orders/${order.id}`;

  const copy =
    reviewStatus === "approved"
      ? {
          title: "Print file approved",
          body: `Your uploaded file (${fileName}) was approved. We will begin printing soon. View details: ${orderDetailUrl}`,
        }
      : {
          title: "Print file could not be printed",
          body: `Your uploaded file (${fileName}) did not meet our print requirements.${
            reviewNotes?.trim() ? ` Note: ${reviewNotes.trim()}.` : ""
          } A refund has been issued for the print portion of your order. View details: ${orderDetailUrl}`,
        };

  const result = await client.models.Notification.create({
    title: copy.title,
    body: copy.body,
    kind: "order",
    userId,
    active: true,
    sortOrder: 85,
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }

  return true;
}
