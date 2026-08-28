import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { getCustomerUserId } from "@/lib/customerAuth";
import { listAllProducts } from "@/lib/listAllProducts";
import {
  fetchCustomerActivity,
  type CustomerActivityRow,
} from "@/services/adminCustomerActivityService";

function formatCartUpdatedAt(value: string | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function ProductLinks({
  items,
  emptyLabel,
}: {
  items: { title: string; slug: string; quantity?: number }[];
  emptyLabel: string;
}) {
  if (!items.length) {
    return <span className="text-on-surface-variant">{emptyLabel}</span>;
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={`${item.slug}-${item.quantity ?? 0}`}>
          <Link
            to={`/admin/products/${item.slug}`}
            className="text-primary hover:underline"
          >
            {item.title}
          </Link>
          {item.quantity != null && item.quantity > 1 ? (
            <span className="text-on-surface-variant"> × {item.quantity}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AdminCustomerActivitySection() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CustomerActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const client = await requireAdminSession(navigate);
      if (!client) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const products = await listAllProducts(client);
        const adminUserId = await getCustomerUserId();
        const activity = await fetchCustomerActivity(
          client,
          products.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
          })),
          {
            ...(adminUserId ? { hideUserIds: [adminUserId] } : {}),
          },
        );
        if (!cancelled) setRows(activity);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load customer activity",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const hasActivity = row.favorites.length > 0 || row.cartLines.length > 0;
      if (onlyActive && !hasActivity) return false;
      if (!query) return true;
      const haystack = [
        row.email,
        row.name ?? "",
        row.userId,
        row.guestId ?? "",
        row.kind,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search, onlyActive]);

  const activeCount = rows.filter(
    (row) => row.favorites.length > 0 || row.cartLines.length > 0,
  ).length;
  const guestCount = rows.filter((row) => row.kind === "guest").length;

  return (
    <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            Customer carts &amp; favorites
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Signed-in Cognito accounts plus active guest sessions (cart /
            favorites). Guests disappear from this list after sign-in merge.
          </p>
        </div>
        <p className="text-label-sm text-on-surface-variant">
          {activeCount} with cart or favorites · {guestCount} guest
          {guestCount === 1 ? "" : "s"} · {rows.length} total
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex min-w-[14rem] flex-1 items-center gap-2 text-body-sm text-on-surface-variant">
          <span className="sr-only">Search customers</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, or guest id"
            className="w-full max-w-md border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
          />
        </label>
        <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          Only accounts with cart or favorites
        </label>
      </div>

      {error && <p className="mt-4 text-error">{error}</p>}

      {loading ? (
        <p className="mt-4 text-on-surface-variant">Loading customer activity…</p>
      ) : filteredRows.length === 0 ? (
        <p className="mt-4 text-on-surface-variant">
          No matching customer accounts.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-outline-variant/20 iron-bevel">
          <table className="w-full min-w-[48rem] text-left text-body-md">
            <thead className="bg-surface-container-high font-label-sm uppercase text-on-surface-variant">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Favorites</th>
                <th className="p-3">Cart</th>
                <th className="p-3">Cart updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={`${row.kind}:${row.userId}`}
                  className="border-t border-outline-variant/10 align-top"
                >
                  <td className="p-3 text-on-surface">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {row.kind === "guest" ? (
                        <span className="inline-block border border-outline-variant/40 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-on-surface-variant">
                          Guest
                        </span>
                      ) : null}
                      <span>{row.email}</span>
                    </div>
                    {row.kind === "guest" ? (
                      <div className="mt-1 text-body-sm text-on-surface-variant">
                        Guest session (not registered)
                        {row.guestId ? (
                          <span className="ml-1 font-mono text-label-sm">
                            {row.guestId}
                          </span>
                        ) : null}
                      </div>
                    ) : row.name ? (
                      <div className="text-body-sm text-on-surface-variant">
                        {row.name}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <ProductLinks items={row.favorites} emptyLabel="—" />
                  </td>
                  <td className="p-3">
                    <ProductLinks
                      items={row.cartLines.map((line) => ({
                        title: line.title,
                        slug: line.slug,
                        quantity: line.quantity,
                      }))}
                      emptyLabel="—"
                    />
                  </td>
                  <td className="p-3 text-on-surface-variant">
                    {formatCartUpdatedAt(row.cartUpdatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
