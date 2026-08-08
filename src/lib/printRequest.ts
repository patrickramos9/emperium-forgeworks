/** M21c — Print request (quote-first) shared types and helpers. */

import type {
  PrintServiceConfigData,
  PrintServiceLinePayload,
} from "./printService";
import { resolvePrintServicePriceCents } from "./printService";

export const PRINT_REQUEST_STATUSES = [
  "submitted",
  "in_review",
  "quoted",
  "paid",
  "declined",
  "cancelled",
] as const;

export type PrintRequestStatus = (typeof PRINT_REQUEST_STATUSES)[number];

export type PrintFigureLineInput = {
  sizeTierId: string;
  quantity: number;
};

export type PrintFigureLine = {
  sizeTierId: string;
  sizeLabel: string;
  quantity: number;
  unitPriceCents: number;
};

export type PrintRequestRecord = {
  id: string;
  userId?: string | null;
  guestId?: string | null;
  email?: string | null;
  status: PrintRequestStatus;
  uploadId: string;
  storagePath: string;
  originalFileName: string;
  resinTypeId: string;
  resinTypeLabel: string;
  resinColorId: string;
  resinColorLabel: string;
  customerNotes?: string | null;
  adminNotes?: string | null;
  figureLines?: PrintFigureLine[] | null;
  quoteCents?: number | null;
  quotedAt?: string | null;
  orderId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function printRequestStatusLabel(status: PrintRequestStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "in_review":
      return "In review";
    case "quoted":
      return "Quoted — ready to pay";
    case "paid":
      return "Paid";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
  }
}

/** Needs admin attention (review / quote) — used for nav badge. */
export function isPendingPrintRequest(
  status: PrintRequestStatus | string | null | undefined,
): boolean {
  return status === "submitted" || status === "in_review";
}

export function countPendingPrintRequests(
  rows: { status: PrintRequestStatus | string | null | undefined }[],
): number {
  return rows.filter((row) => isPendingPrintRequest(row.status)).length;
}

export function parsePrintFigureLines(raw: unknown): PrintFigureLine[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        const sizeTierId = String(row?.sizeTierId ?? "").trim();
        const sizeLabel = String(row?.sizeLabel ?? "").trim();
        const quantity = Number(row?.quantity);
        const unitPriceCents = Number(row?.unitPriceCents);
        if (!sizeTierId || !Number.isFinite(quantity) || quantity < 1) {
          return null;
        }
        return {
          sizeTierId,
          sizeLabel: sizeLabel || sizeTierId,
          quantity: Math.floor(quantity),
          unitPriceCents: Number.isFinite(unitPriceCents)
            ? Math.max(0, Math.floor(unitPriceCents))
            : 0,
        } satisfies PrintFigureLine;
      })
      .filter((row): row is PrintFigureLine => row != null);
  } catch {
    return [];
  }
}

/** Build priced figure lines + quote from admin inputs and live config. */
export function buildQuotedFigureLines(
  config: PrintServiceConfigData,
  inputs: PrintFigureLineInput[],
  resinTypeId: string,
): { figureLines: PrintFigureLine[]; quoteCents: number } {
  if (!inputs.length) {
    throw new Error("Add at least one size tier with a figure count.");
  }

  const figureLines: PrintFigureLine[] = [];
  let quoteCents = 0;

  for (const input of inputs) {
    const sizeTierId = input.sizeTierId.trim();
    const quantity = Math.floor(Number(input.quantity));
    if (!sizeTierId || !Number.isFinite(quantity) || quantity < 1) {
      throw new Error("Each figure line needs a size tier and quantity ≥ 1.");
    }
    const unitPriceCents = resolvePrintServicePriceCents(
      config,
      sizeTierId,
      resinTypeId,
    );
    if (unitPriceCents == null) {
      throw new Error("Selected size or resin is no longer available.");
    }
    const tier = config.sizeTiers.find((row) => row.id === sizeTierId);
    figureLines.push({
      sizeTierId,
      sizeLabel: tier?.label ?? sizeTierId,
      quantity,
      unitPriceCents,
    });
    quoteCents += unitPriceCents * quantity;
  }

  return { figureLines, quoteCents };
}

export function formatPrintFigureLinesSummary(
  lines: PrintFigureLine[] | null | undefined,
): string {
  if (!lines?.length) return "";
  return lines
    .map((line) => `${line.quantity}× ${line.sizeLabel}`)
    .join(" · ");
}

/** Order-line payload after a quoted request is paid. */
export function printServicePayloadFromQuotedRequest(input: {
  uploadId: string;
  storagePath: string;
  originalFileName: string;
  resinTypeId: string;
  resinTypeLabel: string;
  resinColorId: string;
  resinColorLabel: string;
  figureLines: PrintFigureLine[];
  printRequestId: string;
}): PrintServiceLinePayload {
  const summary = formatPrintFigureLinesSummary(input.figureLines);
  const primary = input.figureLines[0];
  return {
    uploadId: input.uploadId,
    storagePath: input.storagePath,
    originalFileName: input.originalFileName,
    sizeTierId: primary?.sizeTierId ?? "multi",
    sizeLabel: summary || primary?.sizeLabel || "Custom print",
    resinTypeId: input.resinTypeId,
    resinTypeLabel: input.resinTypeLabel,
    resinColorId: input.resinColorId,
    resinColorLabel: input.resinColorLabel,
    reviewStatus: "approved",
    figureLines: input.figureLines,
    printRequestId: input.printRequestId,
  };
}
