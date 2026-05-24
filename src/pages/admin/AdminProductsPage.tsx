import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import { adminSignOut } from "@/lib/adminAuth";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { listAllProducts } from "@/lib/listAllProducts";
import { resolveImageUrl } from "@/lib/productImageUrls";

interface AdminProductRow {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  inStock: boolean;
  image?: string;
}

export function AdminProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amplifyReady, setAmplifyReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      const rows = await listAllProducts(client);
      const mapped = await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          priceCents: row.priceCents,
          inStock: row.inStock ?? true,
          image:
            (await resolveImageUrl(row.images?.[0] ?? row.detailImage ?? undefined)) ??
            undefined,
        })),
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
    function onFocus() {
      void loadProducts();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadProducts]);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }

    const client = await requireAdminSession(navigate);
    if (!client) return;

    try {
      const result = await client.models.Product.delete({ id });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await adminSignOut();
      navigate("/admin/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
      <div className="mb-stack-lg flex items-center justify-between">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase text-primary">
            Products
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {products.length} in catalog (live database)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="font-label-sm uppercase text-on-surface-variant hover:text-primary disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
          <Link
            to="/admin/products/new"
            className="bg-primary px-4 py-2 font-label-md uppercase text-on-primary"
          >
            Add Product
          </Link>
        </div>
      </div>
      {loading ? (
        <p className="text-on-surface-variant">Loading...</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : products.length === 0 ? (
        <div className="border border-outline-variant/20 bg-surface-container-low p-6">
          <p className="text-on-surface">No products in the catalog yet.</p>
          {amplifyReady && (
            <p className="mt-2 text-body-md text-on-surface-variant">
              Run <code className="text-primary">npm run seed</code> after the
              backend deploy, or add a product with the button above.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-outline-variant/20">
          <table className="w-full text-left text-body-md">
            <thead className="bg-surface-container-high font-label-sm uppercase text-on-surface-variant">
              <tr>
                <th className="p-3">Image</th>
                <th className="p-3">Title</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-outline-variant/10"
                >
                  <td className="p-3">
                    {p.image && (
                      <img
                        src={p.image}
                        alt=""
                        className="h-12 w-12 object-cover"
                      />
                    )}
                  </td>
                  <td className="p-3 text-on-surface">{p.title}</td>
                  <td className="p-3 text-primary">
                    {formatPrice(p.priceCents)}
                  </td>
                  <td className="p-3">
                    {p.inStock ? "In stock" : "Out"}
                  </td>
                  <td className="p-3 space-x-3">
                    <Link
                      to={`/admin/products/${p.slug}`}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(p.id, p.title)}
                      className="text-error hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
