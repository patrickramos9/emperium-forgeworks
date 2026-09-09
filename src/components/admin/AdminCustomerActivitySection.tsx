import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CatalogPagination } from "@/components/CatalogPagination";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  catalogPageRange,
  catalogTotalPages,
  paginateCatalogItems,
} from "@/lib/catalogPagination";
import { getCustomerUserId } from "@/lib/customerAuth";
import { listAllProducts } from "@/lib/listAllProducts";
import {
  fetchCustomerActivity,
  type CustomerActivityRow,
} from "@/services/adminCustomerActivityService";

const PAGE_SIZE_OPTIONS = [10, 20, 40] as const;
type ActivityPageSize = (typeof PAGE_SIZE_OPTIONS)[number];

type SortColumn = "customer" | "favorites" | "cart" | "lastActivity";
type SortDirection = "asc" | "desc";

function cartQuantity(row: CustomerActivityRow): number {
  return row.cartLines.reduce((sum, line) => sum + line.quantity, 0);
}

function compareActivityRows(
  a: CustomerActivityRow,
  b: CustomerActivityRow,
  column: SortColumn,
  direction: SortDirection,
): number {
  const dir = direction === "asc" ? 1 : -1;
  let cmp = 0;
  switch (column) {
    case "customer":
      cmp = a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
      if (cmp === 0) cmp = a.kind.localeCompare(b.kind);
      break;
    case "favorites":
      cmp = a.favorites.length - b.favorites.length;
      break;
    case "cart":
      cmp = cartQuantity(a) - cartQuantity(b);
      if (cmp === 0) cmp = a.cartLines.length - b.cartLines.length;
      break;
    case "lastActivity": {
      const aMs = Date.parse(a.lastActivityAt ?? "") || 0;
      const bMs = Date.parse(b.lastActivityAt ?? "") || 0;
      cmp = aMs - bMs;
      break;
    }
  }
  if (cmp !== 0) return cmp * dir;
  return a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
}

function SortHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const active = sortColumn === column;
  const ariaSort = active
    ? sortDirection === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th className="p-3" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 uppercase tracking-wide text-on-surface-variant transition-colors hover:text-primary"
      >
        {label}
        <span aria-hidden className="font-mono text-[0.7rem] opacity-80">
          {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function formatActivityAt(value: string | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

/** Local calendar day → start/end of day (ms) for inclusive date filters. */
function dayStartMs(yyyyMmDd: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
  if (!match) return null;
  const ms = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    0,
    0,
    0,
    0,
  ).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function dayEndMs(yyyyMmDd: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
  if (!match) return null;
  const ms = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    23,
    59,
    59,
    999,
  ).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function rowMatchesSearch(row: CustomerActivityRow, query: string): boolean {
  if (!query) return true;
  const haystack = [
    row.email,
    row.name ?? "",
    row.userId,
    row.guestId ?? "",
    row.kind,
    ...row.favorites.map((f) => `${f.title} ${f.slug}`),
    ...row.cartLines.map((l) => `${l.title} ${l.slug}`),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function rowMatchesDateRange(
  row: CustomerActivityRow,
  fromMs: number | null,
  toMs: number | null,
): boolean {
  if (fromMs == null && toMs == null) return true;
  const activityMs = Date.parse(row.lastActivityAt ?? "");
  if (!Number.isFinite(activityMs)) return false;
  if (fromMs != null && activityMs < fromMs) return false;
  if (toMs != null && activityMs > toMs) return false;
  return true;
}

function ProductLinks({
  items,
  emptyLabel,
  showFavoritedAt,
}: {
  items: {
    title: string;
    slug: string;
    quantity?: number;
    favoritedAt?: string;
  }[];
  emptyLabel: string;
  showFavoritedAt?: boolean;
}) {
  if (!items.length) {
    return <span className="text-on-surface-variant">{emptyLabel}</span>;
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={`${item.slug}-${item.quantity ?? 0}-${item.favoritedAt ?? ""}`}>
          <Link
            to={`/admin/products/${item.slug}`}
            className="text-primary hover:underline"
          >
            {item.title}
          </Link>
          {item.quantity != null && item.quantity > 1 ? (
            <span className="text-on-surface-variant"> × {item.quantity}</span>
          ) : null}
          {showFavoritedAt && item.favoritedAt ? (
            <span className="ml-2 text-label-sm text-on-surface-variant">
              {formatActivityAt(item.favoritedAt)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ActivityRow({
  row,
  expanded,
  onToggle,
}: {
  row: CustomerActivityRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const favoriteCount = row.favorites.length;
  const cartQty = row.cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartSkuCount = row.cartLines.length;

  return (
    <>
      <tr className="border-t border-outline-variant/10">
        <td className="p-3 align-middle">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="inline-flex h-8 w-8 items-center justify-center border border-outline-variant/30 bg-surface-container text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            title={expanded ? "Collapse details" : "Expand details"}
          >
            <span className="sr-only">
              {expanded ? "Collapse" : "Expand"} {row.email}
            </span>
            <span aria-hidden className="font-label-md">
              {expanded ? "−" : "+"}
            </span>
          </button>
        </td>
        <td className="p-3 align-middle text-on-surface">
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
              Guest session
              {row.guestId ? (
                <span className="ml-1 font-mono text-label-sm">
                  {row.guestId}
                </span>
              ) : null}
            </div>
          ) : row.name ? (
            <div className="text-body-sm text-on-surface-variant">{row.name}</div>
          ) : null}
        </td>
        <td className="p-3 align-middle tabular-nums text-on-surface">
          {favoriteCount}
        </td>
        <td className="p-3 align-middle tabular-nums text-on-surface">
          {cartSkuCount === 0
            ? "—"
            : `${cartSkuCount} item${cartSkuCount === 1 ? "" : "s"} · ${cartQty} qty`}
        </td>
        <td className="p-3 align-middle text-on-surface-variant">
          {formatActivityAt(row.lastActivityAt)}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-outline-variant/10 bg-surface-container/40">
          <td colSpan={5} className="p-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-label-sm uppercase tracking-widest text-on-surface-variant">
                  Favorites ({favoriteCount})
                </h3>
                <div className="mt-2 text-body-md">
                  <ProductLinks
                    items={row.favorites}
                    emptyLabel="No favorites"
                    showFavoritedAt
                  />
                </div>
              </div>
              <div>
                <h3 className="font-label-sm uppercase tracking-widest text-on-surface-variant">
                  Cart ({cartSkuCount})
                </h3>
                {row.cartUpdatedAt ? (
                  <p className="mt-1 text-label-sm text-on-surface-variant">
                    Cart updated {formatActivityAt(row.cartUpdatedAt)}
                  </p>
                ) : null}
                <div className="mt-2 text-body-md">
                  <ProductLinks
                    items={row.cartLines.map((line) => ({
                      title: line.title,
                      slug: line.slug,
                      quantity: line.quantity,
                    }))}
                    emptyLabel="Empty cart"
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function AdminCustomerActivitySection() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CustomerActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ActivityPageSize>(10);
  const [sortColumn, setSortColumn] = useState<SortColumn>("lastActivity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

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

  const fromMs = useMemo(
    () => (dateFrom ? dayStartMs(dateFrom) : null),
    [dateFrom],
  );
  const toMs = useMemo(() => (dateTo ? dayEndMs(dateTo) : null), [dateTo]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = rows.filter(
      (row) =>
        rowMatchesSearch(row, query) &&
        rowMatchesDateRange(row, fromMs, toMs),
    );
    return [...matched].sort((a, b) =>
      compareActivityRows(a, b, sortColumn, sortDirection),
    );
  }, [rows, search, fromMs, toMs, sortColumn, sortDirection]);

  const totalPages = catalogTotalPages(filteredRows.length, pageSize);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, pageSize, sortColumn, sortDirection]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageRows = useMemo(
    () => paginateCatalogItems(filteredRows, safePage, pageSize),
    [filteredRows, safePage, pageSize],
  );
  const pageRange = catalogPageRange(safePage, pageSize, filteredRows.length);

  const guestCount = rows.filter((row) => row.kind === "guest").length;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === "customer" ? "asc" : "desc");
  };

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            Customer carts &amp; favorites
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Accounts and guest sessions with cart items or favorites. Expand a
            row for product details. Guests drop off after sign-in merge.
          </p>
        </div>
        <p className="text-label-sm text-on-surface-variant">
          {rows.length} with activity · {guestCount} guest
          {guestCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-label-sm text-on-surface-variant">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, name, guest id, or product"
            className="w-full max-w-md border border-outline-variant/30 bg-surface-container px-3 py-2 text-body-sm text-on-surface"
          />
        </label>
        <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
          From
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-outline-variant/30 bg-surface-container px-3 py-2 text-body-sm text-on-surface"
          />
        </label>
        <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
          To
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-outline-variant/30 bg-surface-container px-3 py-2 text-body-sm text-on-surface"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="border border-outline-variant/30 bg-surface-container-high px-3 py-2 font-label-sm uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            Clear dates
          </button>
        )}
        <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
          Per page
          <select
            value={pageSize}
            onChange={(e) => {
              const next = Number.parseInt(e.target.value, 10);
              if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(next)) {
                setPageSize(next as ActivityPageSize);
              }
            }}
            className="border border-outline-variant/30 bg-surface-container px-3 py-2 text-body-sm text-on-surface"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mt-4 text-error">{error}</p>}

      {loading ? (
        <p className="mt-4 text-on-surface-variant">Loading customer activity…</p>
      ) : filteredRows.length === 0 ? (
        <p className="mt-4 text-on-surface-variant">
          No matching carts or favorites.
        </p>
      ) : (
        <>
          <p className="mt-4 text-label-sm text-on-surface-variant">
            Showing {pageRange.start}–{pageRange.end} of {filteredRows.length}
          </p>
          <div className="mt-2 overflow-x-auto border border-outline-variant/20 iron-bevel">
            <table className="w-full min-w-[40rem] text-left text-body-md">
              <thead className="bg-surface-container-high font-label-sm uppercase text-on-surface-variant">
                <tr>
                  <th className="w-12 p-3">
                    <span className="sr-only">Expand</span>
                  </th>
                  <SortHeader
                    label="Customer"
                    column="customer"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Favorites"
                    column="favorites"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Cart"
                    column="cart"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Last activity"
                    column="lastActivity"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const key = `${row.kind}:${row.userId}`;
                  return (
                    <ActivityRow
                      key={key}
                      row={row}
                      expanded={expandedKeys.has(key)}
                      onToggle={() => toggleExpanded(key)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <CatalogPagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}
    </section>
  );
}
