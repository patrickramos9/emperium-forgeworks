const LEGACY_STORAGE_KEY = "efw:admin:product-description-template";

/** One-time migration from browser localStorage (pre-database template). */
export function readLegacyProductDescriptionTemplate(): string {
  try {
    return localStorage.getItem(LEGACY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearLegacyProductDescriptionTemplate(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* private browsing */
  }
}
