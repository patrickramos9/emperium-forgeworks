import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import {
  computeAdminOrderStats,
  formatRevenueLabel,
  isUnacknowledgedPaidOrder,
} from "@/lib/adminOrderStats";
import { PLAUSIBLE_DOMAIN } from "@/lib/config";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { listAllProducts } from "@/lib/listAllProducts";
import {
  adminOrderFulfillmentLabel,
  adminOrderPaymentLabel,
} from "@/lib/orderFulfillment";
import {
  acknowledgeOrders,
  formatOrderDate,
  listAllOrders,
  orderLineItemsSummary,
  parseOrderLineItems,
} from "@/services/orderService";
import {
  defaultGa4DateRange,
  fetchGa4Dashboard,
  readGa4Cache,
  readGa4DateRange,
  todayIsoDate,
  writeGa4Cache,
  writeGa4DateRange,
  type Ga4DashboardResult,
} from "@/services/adminAnalyticsService";
import { AdminCustomerActivitySection } from "@/components/admin/AdminCustomerActivitySection";

function compactRows(
  rows: ({ name: string; value: string } | null | undefined)[] | null | undefined,
): { name: string; value: string }[] {
  return (rows ?? []).filter(
    (row): row is { name: string; value: string } =>
      Boolean(row?.name) && Boolean(row?.value),
  );
}

function compactTrend(
  points:
    | ({ date: string; sessions: number; users: number; pageViews: number } | null | undefined)[]
    | null
    | undefined,
): { date: string; sessions: number; users: number; pageViews: number }[] {
  return (points ?? []).filter(
    (
      point,
    ): point is { date: string; sessions: number; users: number; pageViews: number } =>
      Boolean(point?.date),
  );
}

function compactMetrics(
  metrics:
    | ({ key: string; label: string; value: string } | null | undefined)[]
    | null
    | undefined,
): { key: string; label: string; value: string }[] {
  return (metrics ?? []).filter(
    (metric): metric is { key: string; label: string; value: string } =>
      Boolean(metric?.key) && Boolean(metric?.label) && Boolean(metric?.value),
  );
}

function mapProductDimensionRows(
  rows: { name: string; value: string }[],
  titlesBySlug: Map<string, string>,
): { name: string; value: string }[] {
  return rows.map((row) => {
    const title = titlesBySlug.get(row.name.toLowerCase());
    return title ? { ...row, name: title } : row;
  });
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState(
    computeAdminOrderStats([]),
  );
  const [startDate, setStartDate] = useState(
    () => readGa4DateRange()?.startDate ?? defaultGa4DateRange().startDate,
  );
  const [endDate, setEndDate] = useState(
    () => readGa4DateRange()?.endDate ?? defaultGa4DateRange().endDate,
  );
  const [ga4, setGa4] = useState<Ga4DashboardResult | null>(null);
  const [productTitlesBySlug, setProductTitlesBySlug] = useState(
    () => new Map<string, string>(),
  );
  const [inCartProducts, setInCartProducts] = useState<
    { slug: string; title: string; count: number }[]
  >([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  async function handleAcknowledgeNewOrders() {
    const client = await requireAdminSession(navigate);
    if (!client) return;

    const orders = await listAllOrders(client);
    const ids = orders
      .filter(isUnacknowledgedPaidOrder)
      .map((order) => order.id);

    if (!ids.length) return;

    setAcknowledging(true);
    try {
      await acknowledgeOrders(client, ids);
      setStats(computeAdminOrderStats(await listAllOrders(client)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update orders");
    } finally {
      setAcknowledging(false);
    }
  }

  useEffect(() => {
    async function load() {
      const client = await requireAdminSession(navigate);
      if (!client) return;

      try {
        const [orders, products] = await Promise.all([
          listAllOrders(client),
          listAllProducts(client),
        ]);
        setStats(computeAdminOrderStats(orders));
        setInCartProducts(
          products
            .filter((product) => (product.activeCartCount ?? 0) > 0)
            .map((product) => ({
              slug: product.slug,
              title: product.title,
              count: product.activeCartCount ?? 0,
            }))
            .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)),
        );
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

  useEffect(() => {
    writeGa4DateRange({ startDate, endDate });
  }, [startDate, endDate]);

  useEffect(() => {
    async function loadGa4() {
      const client = await requireAdminSession(navigate);
      if (!client) return;

      const cached = readGa4Cache(startDate, endDate);
      if (cached) {
        setGa4(cached);
        setAnalyticsLoading(false);
      } else {
        setAnalyticsLoading(true);
      }

      try {
        const [fresh, products] = await Promise.all([
          fetchGa4Dashboard(client, startDate, endDate),
          listAllProducts(client),
        ]);
        setGa4(fresh);
        setProductTitlesBySlug(
          new Map(
            products.map((product) => [
              product.slug.toLowerCase(),
              product.title,
            ]),
          ),
        );
        writeGa4Cache(fresh);
        setAnalyticsError(null);
      } catch (err) {
        setAnalyticsError(
          err instanceof Error ? err.message : "Could not load GA4 analytics",
        );
      } finally {
        setAnalyticsLoading(false);
      }
    }
    void loadGa4();
  }, [navigate, startDate, endDate]);

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

      {!error && stats.newOrderCount > 0 && (
        <div className="mt-stack-lg flex flex-wrap items-center justify-between gap-4 border border-primary/40 bg-primary/10 p-4 iron-bevel">
          <div>
            <p className="font-headline-sm text-on-surface">
              {stats.newOrderCount} new order
              {stats.newOrderCount === 1 ? "" : "s"} placed
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Paid orders waiting for review in the admin queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/orders"
              className="bg-primary px-4 py-2 font-label-sm uppercase text-on-primary"
            >
              View orders
            </Link>
            <button
              type="button"
              disabled={acknowledging}
              onClick={() => void handleAcknowledgeNewOrders()}
              className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
            >
              {acknowledging ? "Updating…" : "Mark as seen"}
            </button>
          </div>
        </div>
      )}

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
          <div className="mt-stack-lg grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="New orders"
              value={String(stats.newOrderCount)}
              hint="Paid, not yet marked seen"
            />
            <StatCard
              label="Total orders"
              value={String(stats.orderCount)}
              hint="Paid orders only"
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
                    <th className="p-3">Payment</th>
                    <th className="p-3">Fulfillment</th>
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
                        <td className="p-3 text-on-surface">
                          {adminOrderPaymentLabel(order)}
                        </td>
                        <td className="p-3 text-on-surface-variant">
                          {adminOrderFulfillmentLabel(order)}
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
              Currently in carts
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Live shopper carts (signed-in and guest), not Meta or GA4 add-to-cart
              events. Same counts as Admin → Products.
            </p>
          </div>
          <Link
            to="/admin/products"
            className="font-label-sm uppercase text-primary hover:underline"
          >
            View products
          </Link>
        </div>
        {inCartProducts.length ? (
          <ul className="mt-4 space-y-2 text-body-sm">
            {inCartProducts.map((product) => (
              <li
                key={product.slug}
                className="flex items-center justify-between gap-4"
              >
                <Link
                  to={`/admin/products/${product.slug}`}
                  className="truncate text-primary hover:underline"
                  title={product.title}
                >
                  {product.title}
                </Link>
                <span className="whitespace-nowrap text-on-surface-variant">
                  In {product.count} {product.count === 1 ? "cart" : "carts"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-on-surface-variant">
            No products are in a live cart right now.
          </p>
        )}
      </section>

      <AdminCustomerActivitySection />

      <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
              Traffic (GA4)
            </h2>
            <p className="mt-1 text-label-sm text-on-surface-variant">
              Date range is remembered for this browser session. GA4 data is
              cached per range.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-label-sm text-on-surface-variant">
              Start
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 block rounded border border-outline-variant/20 bg-surface px-3 py-2 text-on-surface"
              />
            </label>
            <label className="text-label-sm text-on-surface-variant">
              End
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayIsoDate()}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 block rounded border border-outline-variant/20 bg-surface px-3 py-2 text-on-surface"
              />
            </label>
          </div>
        </div>

        {analyticsError && <p className="mt-4 text-error">{analyticsError}</p>}

        {analyticsLoading && !ga4 ? (
          <p className="mt-4 text-on-surface-variant">Loading GA4 analytics...</p>
        ) : ga4 ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {compactMetrics(ga4.metrics).map((metric) => (
                <StatCard
                  key={metric.key}
                  label={metric.label}
                  value={metric.value}
                  hint={`${ga4.startDate} to ${ga4.endDate}`}
                />
              ))}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <TrendList points={compactTrend(ga4.trend)} />
              <DimensionList
                title="Most viewed products"
                rows={mapProductDimensionRows(
                  compactRows(ga4.topProducts),
                  productTitlesBySlug,
                )}
                valueLabel="Views"
              />
              <DimensionList
                title="Least viewed products"
                rows={mapProductDimensionRows(
                  compactRows(ga4.lowProducts),
                  productTitlesBySlug,
                )}
                valueLabel="Views"
              />
              <DimensionList
                title="Top pages"
                  rows={compactRows(ga4.topPages)}
                valueLabel="Views"
              />
              <DimensionList
                title="Top sources"
                  rows={compactRows(ga4.topSources)}
                valueLabel="Sessions"
              />
              <DimensionList
                title="Top devices"
                  rows={compactRows(ga4.topDevices)}
                valueLabel="Users"
              />
              <DimensionList
                title="Top countries"
                  rows={compactRows(ga4.topCountries)}
                valueLabel="Users"
              />
            </div>
            <p className="mt-4 text-label-sm text-on-surface-variant">
              Last refreshed: {new Date(ga4.fetchedAt).toLocaleString()}
            </p>
          </>
        ) : (
          <p className="mt-4 text-on-surface-variant">
            No GA4 data is available for this date range.
          </p>
        )}

        {PLAUSIBLE_DOMAIN && (
          <p className="mt-4 text-label-sm text-on-surface-variant">
            Plausible domain configured:{" "}
            <span className="text-on-surface">{PLAUSIBLE_DOMAIN}</span>.
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

function DimensionList({
  title,
  rows,
  valueLabel,
}: {
  title: string;
  rows: { name: string; value: string }[];
  valueLabel: string;
}) {
  return (
    <div className="border border-outline-variant/20 bg-surface p-4 iron-bevel">
      <h3 className="font-label-sm uppercase text-on-surface">{title}</h3>
      <ul className="mt-3 space-y-2 text-body-sm">
        {rows.length ? (
          rows.map((row) => (
            <li
              key={`${title}:${row.name}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="truncate text-on-surface" title={row.name}>
                {row.name}
              </span>
              <span className="whitespace-nowrap text-on-surface-variant">
                {row.value} {valueLabel}
              </span>
            </li>
          ))
        ) : (
          <li className="text-on-surface-variant">No data</li>
        )}
      </ul>
    </div>
  );
}

function TrendList({
  points,
}: {
  points: { date: string; sessions: number; users: number; pageViews: number }[];
}) {
  const maxPageViews = points.reduce(
    (max, point) => Math.max(max, point.pageViews),
    0,
  );
  const recent = points.slice(-14).reverse();

  return (
    <div className="border border-outline-variant/20 bg-surface p-4 iron-bevel">
      <h3 className="font-label-sm uppercase text-on-surface">
        14-day trend (sessions / users / views)
      </h3>
      <ul className="mt-3 space-y-2 text-body-sm">
        {recent.length ? (
          recent.map((point) => {
            const widthPct =
              maxPageViews > 0 ? Math.max(6, (point.pageViews / maxPageViews) * 100) : 6;
            return (
              <li key={point.date} className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-on-surface">
                  <span className="text-on-surface-variant">{point.date}</span>
                  <span className="whitespace-nowrap text-on-surface-variant">
                    {point.sessions.toLocaleString()} / {point.users.toLocaleString()} /{" "}
                    {point.pageViews.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-container-high">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })
        ) : (
          <li className="text-on-surface-variant">No trend data</li>
        )}
      </ul>
    </div>
  );
}
