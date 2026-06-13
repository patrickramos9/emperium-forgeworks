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
  paginateCatalogItems,
  parseCatalogPage,
  SHOP_PRODUCTS_PAGE_SIZE,
} from "@/lib/catalogPagination";

export function ShopPage() {
  const { products, loading, source, loadError } = useProducts();
  const { categoryFilters, shopFilters } = useCategoryFilters();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") ?? ALL_CATEGORY_FILTER;
  const initialQuery = searchParams.get("q") ?? "";
  const [category, setCategory] = useState(initialCategory);
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

  const totalPages = catalogTotalPages(
    filtered.length,
    SHOP_PRODUCTS_PAGE_SIZE,
  );
  const requestedPage = searchParams.get("page");
  const currentPage = parseCatalogPage(requestedPage, totalPages);
  const pagedProducts = useMemo(
    () =>
      paginateCatalogItems(filtered, currentPage, SHOP_PRODUCTS_PAGE_SIZE),
    [filtered, currentPage],
  );
  const pageRange = catalogPageRange(
    currentPage,
    SHOP_PRODUCTS_PAGE_SIZE,
    filtered.length,
  );

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

  return (
    <main className="mx-auto min-h-screen max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
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
          {filtered.length > SHOP_PRODUCTS_PAGE_SIZE && (
            <p className="mb-4 text-body-sm text-on-surface-variant">
              Showing {pageRange.start}–{pageRange.end} of {filtered.length}{" "}
              {filtered.length === 1 ? "product" : "products"}
            </p>
          )}
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
        </>
      )}

      <AnnouncementBlock className="mt-section-gap" />
    </main>
  );
}
