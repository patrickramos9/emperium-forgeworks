import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnnouncementBlock } from "@/components/AnnouncementBlock";
import { CatalogPagination } from "@/components/CatalogPagination";
import { ProductCard } from "@/components/ProductCard";
import { productMatchesCategoryFilter } from "@/data/seedProducts";
import { useCategoryFilters } from "@/hooks/useCategoryFilters";
import { useProducts } from "@/hooks/useProducts";
import {
  ALL_CATEGORY_FILTER,
  isCategoryFilter,
} from "@/lib/productCategories";
import {
  catalogPageRange,
  catalogTotalPages,
  isShopProductsPageSize,
  loadShopPageSize,
  paginateCatalogItems,
  parseCatalogPage,
  saveShopPageSize,
  SHOP_PRODUCTS_PAGE_SIZE_OPTIONS,
  type ShopProductsPageSize,
} from "@/lib/catalogPagination";
import { CONTACT_EMAIL } from "@/lib/config";
import { useSiteLayout } from "@/context/AnnouncementContext";
import { trackMetaSearch } from "@/lib/metaPixel";
import { SHIPPING_DISPATCH_SHOP_BANNER } from "@/lib/shippingPromise";

export function ShopPage() {
  const { products, loading, source, loadError } = useProducts();
  const { mainTopPadding } = useSiteLayout();
  const { categoryFilters, shopFilters } = useCategoryFilters();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") ?? ALL_CATEGORY_FILTER;
  const initialQuery = searchParams.get("q") ?? "";
  const [category, setCategory] = useState(initialCategory);
  const [pageSize, setPageSize] = useState<ShopProductsPageSize>(loadShopPageSize);
  const search = initialQuery;
  const prevFiltersRef = useRef({ category: initialCategory, search: initialQuery });

  useEffect(() => {
    if (isCategoryFilter(category, categoryFilters)) return;
    setCategory(ALL_CATEGORY_FILTER);
    const next = new URLSearchParams(searchParams);
    next.delete("category");
    setSearchParams(next, { replace: true });
  }, [category, categoryFilters, searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    return products
      .filter((p) =>
        productMatchesCategoryFilter(p.category, category, categoryFilters),
      )
      .filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products, category, categoryFilters, search]);

  const totalPages = catalogTotalPages(filtered.length, pageSize);
  const requestedPage = searchParams.get("page");
  const currentPage = parseCatalogPage(requestedPage, totalPages);
  const pagedProducts = useMemo(
    () => paginateCatalogItems(filtered, currentPage, pageSize),
    [filtered, currentPage, pageSize],
  );
  const pageRange = catalogPageRange(currentPage, pageSize, filtered.length);

  useEffect(() => {
    if (requestedPage == null && currentPage === 1) return;
    if (requestedPage === String(currentPage)) return;

    const next = new URLSearchParams(searchParams);
    if (currentPage <= 1) next.delete("page");
    else next.set("page", String(currentPage));
    setSearchParams(next, { replace: true });
  }, [requestedPage, currentPage, searchParams, setSearchParams]);

  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.category === category && prev.search === search) return;
    prevFiltersRef.current = { category, search };
    if (!searchParams.get("page")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    setSearchParams(next, { replace: true });
  }, [category, search, searchParams, setSearchParams]);

  useEffect(() => {
    const query = search.trim();
    if (!query || loading) return;
    trackMetaSearch(
      query,
      filtered.map((product) => product.slug),
    );
  }, [search, loading, filtered]);

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectCategory(cat: string) {
    setCategory(cat);
    const next = new URLSearchParams(searchParams);
    if (cat === ALL_CATEGORY_FILTER) next.delete("category");
    else next.set("category", cat);
    next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function selectPageSize(nextSize: number) {
    if (!isShopProductsPageSize(nextSize) || nextSize === pageSize) return;
    setPageSize(nextSize);
    saveShopPageSize(nextSize);
    if (!searchParams.get("page")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    setSearchParams(next, { replace: true });
  }

  return (
    <main className={`mx-auto min-h-screen max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop ${mainTopPadding}`}>
      <div className="mb-stack-lg flex flex-col justify-between gap-stack-md md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 font-display-lg text-display-lg uppercase tracking-tighter text-primary">
            The Lair
          </h1>
          <p className="max-w-2xl font-body-lg text-on-surface-variant">
            Forged in resin, born in shadow. Explore our collection of premium
            grimdark miniatures and tactical terrain sculps.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {shopFilters.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => selectCategory(cat)}
              className={
                category === cat
                  ? "molten-glow bg-primary px-4 py-2 font-label-md uppercase tracking-widest text-on-primary transition-all hover:brightness-110"
                  : "border border-outline-variant/30 bg-surface-container-high px-4 py-2 font-label-md uppercase tracking-widest text-on-surface-variant transition-all hover:text-primary"
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loadError && !loading && (
        <p className="mb-4 border border-error/40 bg-error/10 px-4 py-3 text-body-sm text-error">
          Catalog could not load from the database ({loadError}). Try refreshing, or sign out of admin and reload.
        </p>
      )}

      {import.meta.env.DEV && !loading && (
        <p className="mb-4 text-body-sm text-on-surface-variant">
          Dev: catalog from <strong>{source}</strong> ({products.length} items)
          {loadError ? ` — ${loadError}` : ""}
        </p>
      )}

      {loading ? (
        <p className="text-on-surface-variant">Loading the lair...</p>
      ) : products.length === 0 ? (
        <p className="text-on-surface-variant">
          {loadError
            ? "The catalog could not be loaded."
            : "No products in the lair yet."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-on-surface-variant">
          No artifacts match your search. Try another category or term.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-on-surface-variant">
              {filtered.length > pageSize
                ? `Showing ${pageRange.start}–${pageRange.end} of ${filtered.length} ${
                    filtered.length === 1 ? "product" : "products"
                  }`
                : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
            </p>
            <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <span className="font-label-sm uppercase tracking-widest">
                Per page
              </span>
              <select
                value={pageSize}
                onChange={(e) =>
                  selectPageSize(Number.parseInt(e.target.value, 10))
                }
                className="border border-outline-variant/30 bg-surface-container-high px-3 py-2 font-label-md uppercase tracking-widest text-on-surface"
                aria-label="Products per page"
              >
                {SHOP_PRODUCTS_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
            {pagedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <CatalogPagination
            className="mt-stack-lg"
            page={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
          <div className="mt-stack-lg border border-primary/40 bg-primary/10 p-stack-md text-center iron-bevel md:p-stack-lg">
            <p className="mx-auto max-w-2xl font-body-lg text-on-surface">
              {SHIPPING_DISPATCH_SHOP_BANNER} Questions?{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline transition-colors hover:text-plasma-glow"
              >
                Message Melissa at {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </>
      )}

      <AnnouncementBlock className="mt-section-gap" />
    </main>
  );
}
