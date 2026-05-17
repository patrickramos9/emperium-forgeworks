import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import { SEED_PRODUCTS } from "@/data/seedProducts";
import { configureAmplify } from "@/lib/amplify";

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
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const ok = await configureAmplify();
      if (!ok) {
        setProducts(
          SEED_PRODUCTS.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            priceCents: p.priceCents,
            inStock: p.inStock,
            image: p.images[0],
          })),
        );
        setLoading(false);
        return;
      }

      try {
        const { getCurrentUser } = await import("aws-amplify/auth");
        await getCurrentUser();
      } catch {
        navigate("/admin/login");
        return;
      }

      try {
        const { generateClient } = await import("aws-amplify/data");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = generateClient<any>();
        const { data } = await client.models.Product.list({});
        if (data?.length) {
          setProducts(
            data.map((row) => ({
              id: row.id,
              slug: row.slug,
              title: row.title,
              priceCents: row.priceCents,
              inStock: row.inStock ?? true,
              image: row.images?.[0] ?? undefined,
            })),
          );
        } else {
          setProducts(
            SEED_PRODUCTS.map((p) => ({
              id: p.id,
              slug: p.slug,
              title: p.title,
              priceCents: p.priceCents,
              inStock: p.inStock,
              image: p.images[0],
            })),
          );
        }
      } catch {
        navigate("/admin/login");
      }
      setLoading(false);
    }
    void load();
  }, [navigate]);

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
      <div className="mb-stack-lg flex items-center justify-between">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Products
        </h1>
        <Link
          to="/admin/products/new"
          className="bg-primary px-4 py-2 font-label-md uppercase text-on-primary"
        >
          Add Product
        </Link>
      </div>
      {loading ? (
        <p className="text-on-surface-variant">Loading...</p>
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
                  <td className="p-3">
                    <Link
                      to={`/admin/products/${p.slug}`}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </Link>
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
