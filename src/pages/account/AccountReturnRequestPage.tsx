import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import { getCustomerUserId } from "@/lib/customerAuth";
import { CONTACT_EMAIL, RETURN_SHIP_INSTRUCTIONS } from "@/lib/config";
import {
  RETURN_REASON_OPTIONS,
  RETURN_STATUS_LABELS,
  canCustomerRequestReturn,
  returnIneligibilityReason,
  type ReturnReason,
} from "@/lib/orderRefunds";
import {
  getOrderById,
  isOrphanedPendingCheckout,
  parseOrderLineItems,
  type OrderRecord,
} from "@/services/orderService";
import {
  listReturnRequestsForOrder,
  submitReturnRequest,
  toReturnLineItems,
  type ReturnRequestRecord,
} from "@/services/returnRequestService";

export function AccountReturnRequestPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [existing, setExisting] = useState<ReturnRequestRecord[]>([]);
  const [reason, setReason] = useState<ReturnReason>("changed_mind");
  const [customerNotes, setCustomerNotes] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const lineItems = useMemo(
    () => (order ? parseOrderLineItems(order.lineItems) : []),
    [order],
  );

  useEffect(() => {
    async function load() {
      if (!orderId) {
        navigate("/account/orders");
        return;
      }

      const client = await requireCustomerSession(
        navigate,
        `/account/orders/${orderId}/return`,
      );
      if (!client) return;

      try {
        const userId = await getCustomerUserId();
        const row = await getOrderById(client, orderId);
        if (!row || row.userId !== userId || isOrphanedPendingCheckout(row)) {
          setError("Order not found.");
          return;
        }
        setOrder(row);
        const returns = await listReturnRequestsForOrder(client, orderId);
        setExisting(returns);
        const items = parseOrderLineItems(row.lineItems);
        setSelectedKeys(
          new Set(
            items.map(
              (item, index) =>
                `${item.productId}:${item.variantId ?? "default"}:${index}`,
            ),
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load order.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orderId, navigate]);

  const openRequest = existing.find((row) =>
    ["requested", "approved", "received"].includes(row.status ?? ""),
  );

  const eligible = order ? canCustomerRequestReturn(order) : false;

  function lineKey(item: (typeof lineItems)[number], index: number) {
    return `${item.productId}:${item.variantId ?? "default"}:${index}`;
  }

  function toggleLine(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!order) return;

    const client = await requireCustomerSession(
      navigate,
      `/account/orders/${orderId}/return`,
    );
    if (!client) return;

    const selectedItems = lineItems.filter((item, index) =>
      selectedKeys.has(lineKey(item, index)),
    );
    if (!selectedItems.length) {
      setError("Select at least one item to return.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await submitReturnRequest(client, {
        orderId: order.id,
        reason,
        customerNotes: customerNotes.trim() || undefined,
        lineItems: toReturnLineItems(selectedItems),
      });
      setMessage(
        "Return request submitted. We will email you with next steps once reviewed.",
      );
      const returns = await listReturnRequestsForOrder(client, order.id);
      setExisting(returns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
        <p className="text-on-surface-variant">Loading…</p>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
        <p className="text-error">{error}</p>
        <Link
          to="/account/orders"
          className="mt-4 inline-block font-label-sm uppercase text-primary hover:underline"
        >
          ← Order history
        </Link>
      </main>
    );
  }

  if (!order) return null;

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
      <Link
        to={`/account/orders/${order.id}`}
        className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
      >
        ← Order details
      </Link>

      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        Request a return
      </h1>

      <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel text-body-sm text-on-surface-variant">
        <p>
          Returns are accepted on new products within 30 days of delivery. Contact
          us before shipping anything back. Buyer pays return shipping. No
          restocking fees. Refunds process within about 2 days after we receive
          your return.
        </p>
        <p className="mt-3">
          If your order has <strong>not shipped yet</strong>, cancel it from{" "}
          <strong>Account → Order details</strong> for an automatic full refund
          instead of starting a return.
        </p>
        <p className="mt-3">
          Questions?{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      {openRequest && (
        <section className="mt-stack-lg border border-primary/30 bg-surface-container-low p-4 iron-bevel">
          <h2 className="font-headline-md uppercase text-on-surface">
            Return in progress
          </h2>
          <p className="mt-2 text-body-sm text-on-surface">
            Status:{" "}
            <strong>
              {RETURN_STATUS_LABELS[openRequest.status ?? "requested"]}
            </strong>
          </p>
          {openRequest.status === "approved" && (
            <p className="mt-2 text-body-sm text-on-surface-variant">
              {RETURN_SHIP_INSTRUCTIONS}
            </p>
          )}
          {openRequest.adminNotes && (
            <p className="mt-2 text-body-sm text-on-surface">
              From the forge: {openRequest.adminNotes}
            </p>
          )}
        </section>
      )}

      {!eligible && !openRequest && (
        <p className="mt-stack-lg text-on-surface-variant">
          {returnIneligibilityReason(order) ??
            "This order is not eligible for a self-service return request."}{" "}
          If you believe this is an error, contact{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      )}

      {eligible && !openRequest && (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-stack-lg space-y-4">
          <fieldset>
            <legend className="font-label-sm uppercase text-on-surface-variant">
              Items to return
            </legend>
            <ul className="mt-2 space-y-2">
              {lineItems.map((item, index) => {
                const key = lineKey(item, index);
                return (
                  <li key={key}>
                    <label className="flex items-start gap-3 text-body-sm">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(key)}
                        onChange={() => toggleLine(key)}
                        className="mt-1"
                      />
                      <span>
                        {item.quantity}× {item.title}
                        {item.variantLabel ? ` (${item.variantLabel})` : ""}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Reason
            </span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReason)}
              className="mt-1 w-full max-w-md border border-outline-variant/30 bg-surface-container px-3 py-2"
            >
              {RETURN_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {reason === "exchange" && (
            <p className="text-body-sm text-secondary">
              Exchanges are handled case-by-case. Tell us what you would like
              instead in the notes below.
            </p>
          )}

          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Notes (optional)
            </span>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            />
          </label>

          {error && <p className="text-error">{error}</p>}
          {message && <p className="text-on-surface-variant">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="molten-glow border border-outline-variant/30 bg-surface-container px-6 py-3 font-label-md uppercase text-primary disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit return request"}
          </button>
        </form>
      )}
    </main>
  );
}
