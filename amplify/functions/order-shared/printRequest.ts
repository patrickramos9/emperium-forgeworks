/** M21c — Print request helpers for Lambdas (keep in sync with src/lib/printRequest.ts). */

import {
  normalizePrintServiceConfigRow,
  resolvePrintServicePriceCents,
  type PrintServiceConfigData,
  type PrintServiceLinePayload,
} from "./printService.js";

export type PrintRequestStatus =
  | "submitted"
  | "in_review"
  | "quoted"
  | "paid"
  | "declined"
  | "cancelled";

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

export { normalizePrintServiceConfigRow };
