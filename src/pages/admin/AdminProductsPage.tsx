import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatPrice, productMatchesCategoryFilter } from "@/data/seedProducts";
import { CategoryFiltersEditor } from "@/components/admin/CategoryFiltersEditor";
import { ConfirmDeleteActions } from "@/components/admin/ConfirmDeleteActions";
import { ProductDescriptionTemplateEditor } from "@/components/admin/ProductDescriptionTemplateEditor";
import { Icon } from "@/components/Icon";
import { useCategoryFilters } from "@/hooks/useCategoryFilters";
import { ALL_CATEGORY_FILTER, isCategoryFilter } from "@/lib/productCategories";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { hasShippingProfileModel } from "@/lib/dataModels";
import { listAllProducts } from "@/lib/listAllProducts";
import { PRODUCT_DRAG_TYPE } from "@/lib/productSortOrder";
import { reorderList } from "@/lib/reorderList";
import { resolveImageUrl } from "@/lib/productImageUrls";
import { productShippingAdminLabels } from "@/lib/shippingProfiles";
import { saveProductSortOrders } from "@/services/productSortService";
import { listAllShippingProfiles } from "@/services/shippingProfileService";

interface AdminProductRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  priceCents: number;
  sortOrder: number;
  featured: boolean;
  shippingProfileLabel: string;
  image?: string;
}

function applySortOrders(products: AdminProductRow[]): AdminProductRow[] {
  return products.map((product, index) => ({
    ...product,
    sortOrder: index + 1,
  }));
}

export function AdminProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const { categoryFilters, shopFilters, reload: reloadCategoryFilters } =
    useCategoryFilters();
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORY_FILTER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amplifyReady, setAmplifyReady] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canReorder = categoryFilter === ALL_CATEGORY_FILTER;

  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        productMatchesCategoryFilter(
          p.category,
          categoryFilter,
          categoryFilters,
        ),
      ),
    [products, categoryFilter, categoryFilters],
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const configured = await configureAmplify();
    setAmplifyReady(configured);
    if (!configured) {
      setError(
        "Amplify is not configured. Deploy the backend or run `npm run sandbox`.",
      );
      setLoading(false);
      return;
    }

    const client = await requireAdminSession(navigate);
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      const [rows, shippingProfiles] = await Promise.all([
        listAllProducts(client),
        hasShippingProfileModel(client)
          ? listAllShippingProfiles(client)
          : Promise.resolve([]),
      ]);

      const mapped = await Promise.all(
        rows.map(async (row) => {
          const { profileLabel } = productShippingAdminLabels(
            { shippingProfileId: row.shippingProfileId },
            shippingProfiles,
          );

          return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            category: row.category,
            priceCents: row.priceCents,
            sortOrder: row.sortOrder ?? 0,
            featured: row.featured ?? false,
            shippingProfileLabel: profileLabel,
            image:
              (await resolveImageUrl(
                row.images?.[0] ?? row.detailImage ?? undefined,
              )) ?? undefined,
          };
        }),
      );
      setProducts(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts, location.key]);

  useEffect(() => {
    if (!isCategoryFilter(categoryFilter, categoryFilters)) {
      setCategoryFilter(ALL_CATEGORY_FILTER);
    }
  }, [categoryFilter, categoryFilters]);

  useEffect(() => {
    function onFocus() {
      void loadProducts();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadProducts]);

  function clearDragState() {
    setDragId(null);
    setDropIndex(null);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    if (!canReorder || reordering) return;
    e.preventDefault();
    setDropIndex(index);
  }

  async function handleDrop(e: React.DragEvent, toIndex: number) {
    if (!canReorder || reordering) return;
    e.preventDefault();

    const draggedId = e.dataTransfer.getData(PRODUCT_DRAG_TYPE) || dragId;
    if (!draggedId) {
      clearDragState();
      return;
    }

    const fromIndex = products.findIndex((product) => product.id === draggedId);
    if (fromIndex < 0 || fromIndex === toIndex) {
      clearDragState();
      return;
    }

    const previous = products.map((product) => ({
      id: product.id,
      sortOrder: product.sortOrder,
    }));
    const reordered = applySortOrders(
      reorderList(products, fromIndex, toIndex),
    );

    setProducts(reordered);
    clearDragState();
    setReordering(true);
    setError(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setProducts(products);
      setReordering(false);
      return;
    }

    try {
      await saveProductSortOrders(client, reordered, previous);
    } catch (err) {
      setProducts(products);
      setError(err instanceof Error ? err.message : "Could not save order");
    } finally {
      setReordering(false);
    }
  }

  async function handleDelete(id: string) {
    const client = await requireAdminSession(navigate);
    if (!client) return;

    setDeletingId(id);
    setError(null);

    try {
      const result = await client.models.Product.delete({ id });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      const previous = products.map((product) => ({
        id: product.id,
        sortOrder: product.sortOrder,
      }));
      const next = applySortOrders(products.filter((p) => p.id !== id));
      setProducts(next);
      await saveProductSortOrders(client, next, previous);
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-container-max">
      <div className="mb-stack-lg flex items-center justify-between">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase text-primary">
            Products
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {categoryFilter === ALL_CATEGORY_FILTER
                ? `${products.length} in catalog (live database)`
                : `${filteredProducts.length} of ${products.length} in catalog`}
            </p>
          )}
        </div>
        <Link
          to="/admin/products/new"
          className="bg-primary px-4 py-2 font-label-md uppercase text-on-primary"
        >
          Add Product
        </Link>
      </div>

      <ProductDescriptionTemplateEditor />

      <CategoryFiltersEditor
        filters={categoryFilters}
        onSaved={() => {
          void reloadCategoryFilters();
          void loadProducts();
        }}
      />

      {!loading && !error && products.length > 0 && (
        <div className="mb-stack-md flex flex-wrap gap-2">
          {shopFilters.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={
                categoryFilter === cat
                  ? "bg-primary px-3 py-1.5 font-label-sm uppercase text-on-primary"
                  : "border border-outline-variant/30 bg-surface-container-high px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:text-primary"
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {!loading && !error && products.length > 0 && canReorder && (
        <p className="mb-stack-md text-body-sm text-on-surface-variant">
          Drag products to set shop order. {reordering ? "Saving order…" : ""}
        </p>
      )}

      {!loading && !error && products.length > 0 && !canReorder && (
        <p className="mb-stack-md text-body-sm text-on-surface-variant">
          Switch to {ALL_CATEGORY_FILTER} to drag and reorder the catalog.
        </p>
      )}

      {loading ? (
        <p className="text-on-surface-variant">Loading...</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : products.length === 0 ? (
        <div className="border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
          <p className="text-on-surface">No products in the catalog yet.</p>
          {amplifyReady && (
            <p className="mt-2 text-body-md text-on-surface-variant">
              Run <code className="text-primary">npm run seed</code> after the
              backend deploy, or add a product with the button above.
            </p>
          )}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
          <p className="text-on-surface">
            No products in the &ldquo;{categoryFilter}&rdquo; category.
          </p>
          <button
            type="button"
            onClick={() => setCategoryFilter(ALL_CATEGORY_FILTER)}
            className="mt-3 font-label-sm uppercase text-primary hover:underline"
          >
            Show all products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product, index) => {
            const isDragging = dragId === product.id;
            const isDropTarget =
              canReorder && dropIndex === index && dragId !== product.id;

            return (
              <article
                key={product.id}
                draggable={canReorder && !reordering && deletingId === null}
                onDragStart={(e) => {
                  if (!canReorder) return;
                  e.dataTransfer.setData(PRODUCT_DRAG_TYPE, product.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDragId(product.id);
                }}
                onDragEnd={clearDragState}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={() => setDropIndex(null)}
                onDrop={(e) => void handleDrop(e, index)}
                className={`relative flex flex-col overflow-hidden border bg-surface-container-low iron-bevel transition-all ${
                  isDragging ? "opacity-50" : ""
                } ${
                  isDropTarget
                    ? "border-primary ring-1 ring-primary"
                    : "border-outline-variant/20"
                }`}
              >
                {canReorder && (
                  <div
                    className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center bg-surface-container-highest/90 text-on-surface-variant active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-hidden
                  >
                    <Icon name="drag_indicator" className="text-xl" />
                  </div>
                )}
                {product.featured && (
                  <div
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center bg-surface-container-highest/90 text-secondary"
                    title="Featured on home page"
                    aria-label="Featured on home page"
                  >
                    <Icon name="star" filled className="text-xl" />
                  </div>
                )}

                <div className="aspect-[1.26] bg-surface-container-high">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-on-surface-variant">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <h2 className="line-clamp-2 font-headline-sm text-on-surface">
                    {product.title}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    {product.category}
                  </p>
                  <p className="text-primary">{formatPrice(product.priceCents)}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {product.shippingProfileLabel}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      to={`/admin/products/${product.slug}`}
                      className="font-label-sm uppercase text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <ConfirmDeleteActions
                      itemLabel={product.title}
                      pending={deleteConfirmId === product.id}
                      busy={deletingId === product.id}
                      onBegin={() => setDeleteConfirmId(product.id)}
                      onCancel={() => setDeleteConfirmId(null)}
                      onConfirm={() => void handleDelete(product.id)}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
