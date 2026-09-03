export const SHOP_PRODUCTS_PAGE_SIZE = 12;

export const SHOP_PRODUCTS_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

export type ShopProductsPageSize =
  (typeof SHOP_PRODUCTS_PAGE_SIZE_OPTIONS)[number];

const SHOP_PAGE_SIZE_STORAGE_KEY = "efw_shop_page_size";

export function isShopProductsPageSize(
  value: number,
): value is ShopProductsPageSize {
  return (SHOP_PRODUCTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

/** Prefer the visitor's saved page size; fall back to the store default. */
export function loadShopPageSize(): ShopProductsPageSize {
  try {
    const raw = localStorage.getItem(SHOP_PAGE_SIZE_STORAGE_KEY);
    if (!raw) return SHOP_PRODUCTS_PAGE_SIZE;
    const parsed = Number.parseInt(raw, 10);
    if (isShopProductsPageSize(parsed)) return parsed;
    return SHOP_PRODUCTS_PAGE_SIZE;
  } catch {
    return SHOP_PRODUCTS_PAGE_SIZE;
  }
}

export function saveShopPageSize(pageSize: ShopProductsPageSize): void {
  try {
    localStorage.setItem(SHOP_PAGE_SIZE_STORAGE_KEY, String(pageSize));
  } catch {
    // Ignore quota / private-mode failures; in-memory preference still applies.
  }
}

export function parseCatalogPage(
  raw: string | null | undefined,
  totalPages: number,
): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, Math.max(1, totalPages));
}

export function catalogTotalPages(itemCount: number, pageSize: number): number {
  if (itemCount <= 0) return 1;
  return Math.ceil(itemCount / pageSize);
}

export function paginateCatalogItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function catalogPageRange(
  page: number,
  pageSize: number,
  totalItems: number,
): { start: number; end: number } {
  if (totalItems === 0) return { start: 0, end: 0 };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return { start, end };
}
