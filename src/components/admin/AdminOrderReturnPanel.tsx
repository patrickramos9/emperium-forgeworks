import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { RETURN_SHIP_INSTRUCTIONS, CONTACT_EMAIL } from "@/lib/config";
import { RETURN_STATUS_LABELS } from "@/lib/orderRefunds";
import {
  listReturnRequestsForOrder,
  parseReturnLineItems,
  updateReturnRequest,
  type ReturnRequestRecord,
  type ReturnRequestStatus,
} from "@/services/returnRequestService";

const STATUS_OPTIONS: ReturnRequestStatus[] = [
  "requested",
  "approved",
  "denied",
  "received",
  "closed",
];

type Props = {
  client: AmplifyDataClient;
  orderId: string;
};

export function AdminOrderReturnPanel({ client, orderId }: Props) {
  const [requests, setRequests] = useState<ReturnRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listReturnRequestsForOrder(client, orderId);
      setRequests(rows);
      setDraftNotes(
        Object.fromEntries(
          rows.map((row) => [row.id, row.adminNotes ?? ""]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load returns.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [client, orderId]);

  async function handleStatusChange(
    request: ReturnRequestRecord,
    status: ReturnRequestStatus,
  ) {
    setSavingId(request.id);
    setError(null);
    try {
      await updateReturnRequest(client, {
        returnRequestId: request.id,
        status,
        adminNotes: draftNotes[request.id],
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveNotes(
    e: FormEvent,
    request: ReturnRequestRecord,
  ) {
    e.preventDefault();
    setSavingId(request.id);
    setError(null);
    try {
      await updateReturnRequest(client, {
        returnRequestId: request.id,
        adminNotes: draftNotes[request.id],
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <p className="mt-stack-lg text-body-sm text-on-surface-variant">
        Loading return requests…
      </p>
    );
  }

  if (!requests.length) {
    return null;
  }

  return (
    <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Return requests
        </h2>
        <Link
          to="/admin/returns"
          className="font-label-sm uppercase text-primary hover:underline"
        >
          All returns
        </Link>
      </div>

      {error && <p className="mt-3 text-error">{error}</p>}

      <ul className="mt-4 space-y-4">
        {requests.map((request) => {
          const items = parseReturnLineItems(request.lineItems);
          const status = request.status ?? "requested";
          const isExchange = request.reason === "exchange";

          return (
            <li
              key={request.id}
              className="border border-outline-variant/15 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-label-md uppercase text-on-surface">
                  {RETURN_STATUS_LABELS[status] ?? status}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {request.requestedAt
                    ? new Date(request.requestedAt).toLocaleString()
                    : "—"}
                </p>
              </div>
              <p className="mt-2 text-body-sm text-on-surface">
                Reason: <strong>{request.reason}</strong>
              </p>
              {request.customerNotes && (
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Customer: {request.customerNotes}
                </p>
              )}
              {isExchange && (
                <p className="mt-2 text-body-sm text-secondary">
                  Exchange — handled case-by-case. Approve the return, then
                  re-ship or refund any price difference (promo code or manual
                  order).
                </p>
              )}
              {items.length > 0 && (
                <ul className="mt-2 text-body-sm text-on-surface-variant">
                  {items.map((item) => (
                    <li key={`${item.productId}-${item.variantLabel ?? ""}`}>
                      {item.quantity}× {item.title}
                      {item.variantLabel ? ` (${item.variantLabel})` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {status === "approved" && (
                <p className="mt-3 text-body-sm text-on-surface">
                  {RETURN_SHIP_INSTRUCTIONS}
                </p>
              )}

              <label className="mt-3 block">
                <span className="font-label-sm uppercase text-on-surface-variant">
                  Admin notes
                </span>
                <textarea
                  value={draftNotes[request.id] ?? ""}
                  onChange={(e) =>
                    setDraftNotes((prev) => ({
                      ...prev,
                      [request.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-body-sm"
                  placeholder={`Instructions for customer (${CONTACT_EMAIL})`}
                />
              </label>

              <form
                onSubmit={(e) => void handleSaveNotes(e, request)}
                className="mt-2"
              >
                <button
                  type="submit"
                  disabled={savingId === request.id}
                  className="font-label-sm uppercase text-primary hover:underline disabled:opacity-50"
                >
                  Save notes
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter((s) => s !== status).map((next) => (
                  <button
                    key={next}
                    type="button"
                    disabled={savingId === request.id}
                    onClick={() => void handleStatusChange(request, next)}
                    className="border border-outline-variant/30 px-3 py-1.5 font-label-sm uppercase text-on-surface-variant hover:text-primary disabled:opacity-50"
                  >
                    Mark {RETURN_STATUS_LABELS[next] ?? next}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
