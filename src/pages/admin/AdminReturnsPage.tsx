import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RETURN_STATUS_LABELS } from "@/lib/orderRefunds";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  listReturnRequests,
  parseReturnLineItems,
  type ReturnRequestRecord,
} from "@/services/returnRequestService";

export function AdminReturnsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ReturnRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  useEffect(() => {
    async function load() {
      const client = await requireAdminSession(navigate);
      if (!client) return;

      try {
        setRequests(await listReturnRequests(client));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load returns.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate]);

  const visible = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((row) =>
      ["requested", "approved", "received"].includes(row.status ?? ""),
    );
  }, [filter, requests]);

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Returns
      </h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Customer return requests. Approve before the customer ships anything back.
      </p>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => setFilter("open")}
          className={`font-label-sm uppercase ${filter === "open" ? "text-primary" : "text-on-surface-variant"}`}
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`font-label-sm uppercase ${filter === "all" ? "text-primary" : "text-on-surface-variant"}`}
        >
          All
        </button>
      </div>

      {loading && (
        <p className="mt-6 text-on-surface-variant">Loading…</p>
      )}
      {error && <p className="mt-6 text-error">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <p className="mt-6 text-on-surface-variant">No return requests.</p>
      )}

      <ul className="mt-6 space-y-3">
        {visible.map((request) => {
          const items = parseReturnLineItems(request.lineItems);
          const status = request.status ?? "requested";
          return (
            <li
              key={request.id}
              className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to={`/admin/orders/${request.orderId}`}
                  className="font-label-md uppercase text-primary hover:underline"
                >
                  Order {request.orderId.slice(0, 8)}…
                </Link>
                <span className="font-label-sm uppercase text-on-surface-variant">
                  {RETURN_STATUS_LABELS[status] ?? status}
                </span>
              </div>
              <p className="mt-2 text-body-sm text-on-surface">
                {request.email ?? "—"} · {request.reason}
                {request.reason === "exchange" ? " (exchange)" : ""}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                {request.requestedAt
                  ? new Date(request.requestedAt).toLocaleString()
                  : "—"}
                {items.length > 0 &&
                  ` · ${items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}`}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
