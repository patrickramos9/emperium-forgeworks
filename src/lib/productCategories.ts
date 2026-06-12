/** Default filters when CatalogSettings is missing (seed / offline). */
export const DEFAULT_PRODUCT_CATEGORY_FILTERS = [
  "Horror",
  "Dark Fantasy",
  "Sci-Fi",
  "Terrain",
  "SF & Fantasy",
] as const;

export const ALL_CATEGORY_FILTER = "All";

export function buildShopCategoryFilters(categoryFilters: string[]): string[] {
  return [ALL_CATEGORY_FILTER, ...categoryFilters];
}

export function isCategoryFilter(
  value: string,
  categoryFilters: string[],
): boolean {
  return (
    value === ALL_CATEGORY_FILTER || categoryFilters.includes(value)
  );
}

export function normalizeCategoryFilterName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function validateCategoryFilterNames(names: string[]): string | null {
  const normalized = names.map(normalizeCategoryFilterName);
  if (normalized.some((name) => !name)) {
    return "Filter names cannot be empty.";
  }
  if (normalized.some((name) => name === ALL_CATEGORY_FILTER)) {
    return `"${ALL_CATEGORY_FILTER}" is reserved and cannot be used as a filter name.`;
  }
  const seen = new Set<string>();
  for (const name of normalized) {
    if (seen.has(name)) return `Duplicate filter name: "${name}".`;
    seen.add(name);
  }
  return null;
}

/** Products with removed categories only appear under All. */
export function productMatchesCategoryFilter(
  productCategory: string,
  filter: string,
  categoryFilters: string[],
): boolean {
  if (filter === ALL_CATEGORY_FILTER) return true;
  if (!categoryFilters.includes(filter)) return false;
  return productCategory === filter;
}
