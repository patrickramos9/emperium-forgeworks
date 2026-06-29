/** M21 — Printing as a Service shared types and helpers. */

export const PRINT_SERVICE_CONFIG_KEY = "default";
export const PRINT_SERVICE_CATALOG_SLUG = "printing-as-a-service";
export const DEFAULT_MAX_STL_BYTES = 52_428_800; // 50 MiB

/** Backing catalog row for /print checkout — not shown on the public shop. */
export function isPrintServiceCatalogSlug(slug: string | null | undefined): boolean {
  return slug?.trim() === PRINT_SERVICE_CATALOG_SLUG;
}

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
  /** Optional swatch color, e.g. `#36454F` — set via admin color picker. */
  hexColor?: string;
  resinTypeIds?: string[];
  sortOrder?: number;
};

export type PrintServiceConfigData = {
  configKey: string;
  active: boolean;
  catalogProductSlug: string;
  policyMarkdown: string;
  maxFileBytes: number;
  sizeTiers: PrintServiceSizeTier[];
  resinTypes: PrintServiceResinType[];
  resinColors: PrintServiceResinColor[];
};

/** Payload stored on cart lines and order snapshots. */
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
};

export function isPrintServiceCartLine(
  line: { printService?: PrintServiceLinePayload | null },
): boolean {
  return Boolean(line.printService?.uploadId && line.printService.storagePath);
}

export function printServiceLineKey(productId: string, uploadId: string): string {
  return `${productId}:print:${uploadId}`;
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

export function serializePrintServicePayload(
  payload: PrintServiceLinePayload,
): string {
  return JSON.stringify(payload);
}

function sorted<T extends { sortOrder?: number }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || 0,
  );
}

/** Normalize admin-entered hex to `#RRGGBB`, or undefined when invalid. */
export function normalizeHexColor(
  value: string | null | undefined,
): string | undefined {
  if (!value?.trim()) return undefined;
  let hex = value.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return undefined;
}

function normalizeResinColor(row: PrintServiceResinColor): PrintServiceResinColor {
  const hexColor = normalizeHexColor(row.hexColor);
  return hexColor ? { ...row, hexColor } : { ...row, hexColor: undefined };
}

export function normalizePrintServiceConfig(
  row: {
    configKey?: string | null;
    active?: boolean | null;
    catalogProductSlug?: string | null;
    policyMarkdown?: string | null;
    maxFileBytes?: number | null;
    sizeTiers?: unknown;
    resinTypes?: unknown;
    resinColors?: unknown;
  } | null | undefined,
): PrintServiceConfigData | null {
  if (!row) return null;

  const parseArray = <T>(value: unknown): T[] => {
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
  };

  return {
    configKey: row.configKey?.trim() || PRINT_SERVICE_CONFIG_KEY,
    active: row.active === true,
    catalogProductSlug:
      row.catalogProductSlug?.trim() || PRINT_SERVICE_CATALOG_SLUG,
    policyMarkdown: row.policyMarkdown?.trim() || "",
    maxFileBytes: row.maxFileBytes ?? DEFAULT_MAX_STL_BYTES,
    sizeTiers: sorted(parseArray<PrintServiceSizeTier>(row.sizeTiers)),
    resinTypes: sorted(parseArray<PrintServiceResinType>(row.resinTypes)),
    resinColors: sorted(
      parseArray<PrintServiceResinColor>(row.resinColors).map(normalizeResinColor),
    ),
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

export function formatPrintServiceVariantLabel(
  payload: Pick<
    PrintServiceLinePayload,
    "sizeLabel" | "resinTypeLabel" | "resinColorLabel" | "originalFileName"
  >,
): string {
  const parts = [
    payload.sizeLabel,
    payload.resinTypeLabel,
    payload.resinColorLabel,
  ].filter(Boolean);
  const config = parts.join(" · ");
  const file = payload.originalFileName?.trim();
  if (file) return `${config} · ${file}`;
  return config;
}

export function isStlFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".stl");
}

export function defaultPrintServiceConfig(): PrintServiceConfigData {
  return {
    configKey: PRINT_SERVICE_CONFIG_KEY,
    active: false,
    catalogProductSlug: PRINT_SERVICE_CATALOG_SLUG,
    policyMarkdown:
      "- You own or have rights to print the uploaded file.\n- We delete your STL after the print ships.\n- We do not re-sell your file or physical print.",
    maxFileBytes: DEFAULT_MAX_STL_BYTES,
    sizeTiers: [
      { id: "32mm", label: "32mm", priceCents: 2500, sortOrder: 0 },
      { id: "75mm", label: "75mm", priceCents: 4500, sortOrder: 1 },
      { id: "100mm", label: "100mm", priceCents: 6500, sortOrder: 2 },
    ],
    resinTypes: [
      { id: "standard", label: "Standard", priceDeltaCents: 0, sortOrder: 0 },
      { id: "tough", label: "Tough", priceDeltaCents: 500, sortOrder: 1 },
    ],
    resinColors: [
      {
        id: "space-grey",
        label: "Space Grey",
        hexColor: "#848688",
        resinTypeIds: ["standard", "tough"],
        sortOrder: 0,
      },
      {
        id: "white",
        label: "White",
        hexColor: "#FFFFFF",
        resinTypeIds: ["standard", "tough"],
        sortOrder: 1,
      },
    ],
  };
}
