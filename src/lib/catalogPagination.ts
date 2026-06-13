export const SHOP_PRODUCTS_PAGE_SIZE = 12;

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
