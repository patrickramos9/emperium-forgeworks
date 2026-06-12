const STORAGE_KEY = "efw:admin:product-description-template";

export function readProductDescriptionTemplate(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeProductDescriptionTemplate(html: string): void {
  try {
    if (!html.trim()) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, html);
  } catch {
    /* private browsing / quota */
  }
}
