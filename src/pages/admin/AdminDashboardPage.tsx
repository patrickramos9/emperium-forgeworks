import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import {
  computeAdminOrderStats,
  formatRevenueLabel,
} from "@/lib/adminOrderStats";
import { PLAUSIBLE_DOMAIN } from "@/lib/config";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  formatOrderDate,
  listAllOrders,
  orderLineItemsSummary,
  orderStatusLabel,
  parseOrderLineItems,
} from "@/services/orderService";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState(
    computeAdminOrderStats([]),
  );

  useEffect(() => {
    async function load() {
      const client = await requireAdminSession(navigate);
      if (!client) return;

      try {
        const orders = await listAllOrders(client);
        setStats(computeAdminOrderStats(orders));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load dashboard",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate]);

  if (loading) {
    return <p className="text-on-surface-variant">Loading dashboard...</p>;
  }

  return (
    <div className="mx-auto max-w-container-max">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Dashboard
      </h1>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Store overview from order records
      </p>

      {error && <p className="mt-4 text-error">{error}</p>}

      {!error && stats.orderCount === 0 && (
        <div className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
          <p className="text-on-surface-variant">
            No orders yet. Complete a mock checkout on the storefront to see
            stats here.
          </p>
          <Link
            to="/shop"
            className="mt-4 inline-block font-label-sm uppercase text-primary hover:underline"
          >
            Open shop →
          </Link>
        </div>
      )}

      {!error && stats.orderCount > 0 && (
        <>
          <div className="mt-stack-lg grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total orders"
              value={String(stats.orderCount)}
              hint={`${stats.paidOrderCount} paid`}
            />
            <StatCard
              label="Revenue"
              value={formatRevenueLabel(
                stats.revenueCents,
                stats.mockOrderCount,
                stats.paidOrderCount,
              )}
              hint="Paid orders only"
            />
            <StatCard
              label="Average order"
              value={
                stats.paidOrderCount > 0
                  ? formatPrice(stats.averageOrderCents)
                  : "—"
              }
              hint="AOV"
            />
          </div>

          <section className="mt-stack-lg">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
                Recent orders
              </h2>
              <Link
                to="/admin/orders"
                className="font-label-sm uppercase text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto border border-outline-variant/20 iron-bevel">
              <table className="w-full text-left text-body-md">
                <thead className="bg-surface-container-high font-label-sm uppercase text-on-surface-variant">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Items</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => {
                    const items = parseOrderLineItems(order.lineItems);
                    return (
                      <tr
                        key={order.id}
                        className="border-t border-outline-variant/10"
                      >
                        <td className="p-3 text-on-surface">
                          {formatOrderDate(order.createdAt)}
                        </td>
                        <td className="p-3 text-on-surface-variant">
                          {orderStatusLabel(order.status)}
                        </td>
                        <td className="p-3 text-primary">
                          {formatPrice(order.totalCents)}
                        </td>
                        <td className="p-3 text-label-sm text-on-surface-variant">
                          {orderLineItemsSummary(items)}
                        </td>
                        <td className="p-3">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="text-primary hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Traffic
        </h2>
        {PLAUSIBLE_DOMAIN ? (
          <p className="mt-2 text-on-surface-variant">
            Analytics configured for{" "}
            <span className="text-on-surface">{PLAUSIBLE_DOMAIN}</span>.{" "}
            <a
              href={`https://plausible.io/${PLAUSIBLE_DOMAIN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Open Plausible dashboard
            </a>
          </p>
        ) : (
          <p className="mt-2 text-on-surface-variant">
            Connect Plausible or GA4 — set{" "}
            <code className="text-primary">VITE_PLAUSIBLE_DOMAIN</code> in
            Amplify environment variables.
          </p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
      <p className="font-label-sm uppercase text-on-surface-variant">{label}</p>
      <p className="mt-2 font-display-lg text-headline-md text-primary">
        {value}
      </p>
      <p className="mt-1 text-label-sm text-on-surface-variant/80">{hint}</p>
    </div>
  );
}
