export const PRINT_SERVICE_CONFIG_KEY = "default";
export const PRINT_SERVICE_CATALOG_SLUG = "printing-as-a-service";

export type PrintServiceSizeTier = {
  id: string;
  label: string;
  priceCents: number;
  sortOrder?: number;
};

export type PrintServiceResinType = {
  id: string;
  label: string;
  priceDeltaCents?: number;
  sortOrder?: number;
};

export type PrintServiceResinColor = {
  id: string;
  label: string;
  resinTypeIds?: string[];
  sortOrder?: number;
};

export type PrintServiceConfigData = {
  active: boolean;
  catalogProductSlug: string;
  maxFileBytes: number;
  sizeTiers: PrintServiceSizeTier[];
  resinTypes: PrintServiceResinType[];
  resinColors: PrintServiceResinColor[];
};

export type PrintReviewStatus = "pending_review" | "approved" | "rejected";

export type PrintServiceLinePayload = {
  uploadId: string;
  storagePath: string;
  originalFileName: string;
  sizeTierId: string;
  sizeLabel: string;
  resinTypeId: string;
  resinTypeLabel: string;
  resinColorId: string;
  resinColorLabel: string;
  filePurgedAt?: string;
  reviewStatus?: PrintReviewStatus;
  reviewNotes?: string;
  reviewedAt?: string;
  figureLines?: {
    sizeTierId: string;
    sizeLabel: string;
    quantity: number;
    unitPriceCents: number;
  }[];
  printRequestId?: string;
};

export type CheckoutLineItemWithPrint = {
  productId: string;
  slug: string;
  title: string;
  priceCents: number;
  quantity: number;
  printServiceJson?: string | null;
};

function parseArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as T[]) : [];
}

export function parsePrintServiceJson(
  raw: string | null | undefined,
): PrintServiceLinePayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as PrintServiceLinePayload;
    if (!parsed.uploadId || !parsed.storagePath || !parsed.sizeTierId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function normalizePrintServiceConfigRow(
  row: {
    active?: boolean | null;
    catalogProductSlug?: string | null;
    maxFileBytes?: number | null;
    sizeTiers?: unknown;
    resinTypes?: unknown;
    resinColors?: unknown;
  } | null | undefined,
): PrintServiceConfigData | null {
  if (!row) return null;
  return {
    active: row.active === true,
    catalogProductSlug:
      row.catalogProductSlug?.trim() || PRINT_SERVICE_CATALOG_SLUG,
    maxFileBytes: row.maxFileBytes ?? 1_073_741_824,
    sizeTiers: parseArray<PrintServiceSizeTier>(row.sizeTiers),
    resinTypes: parseArray<PrintServiceResinType>(row.resinTypes),
    resinColors: parseArray<PrintServiceResinColor>(row.resinColors),
  };
}

export function resolvePrintServicePriceCents(
  config: PrintServiceConfigData,
  sizeTierId: string,
  resinTypeId: string,
): number | null {
  const tier = config.sizeTiers.find((row) => row.id === sizeTierId);
  if (!tier) return null;
  const resin = config.resinTypes.find((row) => row.id === resinTypeId);
  if (!resin) return null;
  return tier.priceCents + (resin.priceDeltaCents ?? 0);
}

export function isPrintServiceLine(item: CheckoutLineItemWithPrint): boolean {
  return Boolean(parsePrintServiceJson(item.printServiceJson));
}

export function formatPrintServiceVariantLabel(
  payload: PrintServiceLinePayload,
): string {
  return [payload.sizeLabel, payload.resinTypeLabel, payload.resinColorLabel]
    .filter(Boolean)
    .join(" · ");
}

export function effectivePrintReviewStatus(
  payload: Pick<PrintServiceLinePayload, "reviewStatus">,
): PrintReviewStatus {
  return payload.reviewStatus ?? "approved";
}

export function withPendingPrintReview(
  payload: PrintServiceLinePayload,
): PrintServiceLinePayload {
  return { ...payload, reviewStatus: "pending_review" };
}
