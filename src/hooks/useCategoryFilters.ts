import { useCallback, useEffect, useMemo, useState } from "react";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import {
  buildShopCategoryFilters,
  DEFAULT_PRODUCT_CATEGORY_FILTERS,
} from "@/lib/productCategories";
import { getCatalogCategoryFilters } from "@/services/catalogSettingsService";

export function useCategoryFilters() {
  const [categoryFilters, setCategoryFilters] = useState<string[]>([
    ...DEFAULT_PRODUCT_CATEGORY_FILTERS,
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    const client = await getGuestDataClient();
    if (!client) {
      setCategoryFilters([...DEFAULT_PRODUCT_CATEGORY_FILTERS]);
      setLoading(false);
      return;
    }

    try {
      const filters = await getCatalogCategoryFilters(client);
      setCategoryFilters(filters);
    } catch (err) {
      setCategoryFilters([...DEFAULT_PRODUCT_CATEGORY_FILTERS]);
      setError(
        err instanceof Error ? err.message : "Could not load category filters",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const shopFilters = useMemo(
    () => buildShopCategoryFilters(categoryFilters),
    [categoryFilters],
  );

  return { categoryFilters, shopFilters, loading, error, reload };
}
