import { FormEvent, useMemo, useState } from "react";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { formatPrice } from "@/data/seedProducts";
import {
  parseRefundLedger,
  paymentStatusDetail,
  refundableCentsRemaining,
  STRIPE_REFUND_REASON_OPTIONS,
  type StripeRefundReason,
} from "@/lib/orderRefunds";
import { createStripeRefund } from "@/services/refundService";
import type { OrderRecord } from "@/services/orderService";

type Props = {
  client: AmplifyDataClient;
  order: OrderRecord;
  onOrderUpdated: (order: OrderRecord) => void;
};

export function AdminOrderRefundPanel({
  client,
  order,
  onOrderUpdated,
}: Props) {
  const remaining = useMemo(() => refundableCentsRemaining(order), [order]);
  const ledger = useMemo(() => parseRefundLedger(order.refunds), [order.refunds]);
  const isStripe = order.paymentProvider === "stripe";
  const canRefund =
    isStripe &&
    (order.status === "paid" || order.status === "refunded") &&
    remaining > 0;

  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialDollars, setPartialDollars] = useState("");
  const [reason, setReason] =
    useState<StripeRefundReason>("requested_by_customer");
  const [refundNotes, setRefundNotes] = useState(order.refundNotes ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const partialCents = useMemo(() => {
    const parsed = Number.parseFloat(partialDollars.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  }, [partialDollars]);

  const refundAmountCents = mode === "full" ? remaining : partialCents;

  async function handleRefund() {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await createStripeRefund(client, {
        orderId: order.id,
        ...(mode === "partial" ? { amountCents: partialCents } : {}),
        reason,
        refundNotes: refundNotes.trim() || undefined,
      });
      const refreshed = await client.models.Order.get({ id: order.id });
      if (refreshed.data) {
        onOrderUpdated(refreshed.data);
      }
      setMessage(
        `Refund issued (${formatPrice(result.refundedCents)} total refunded on order).`,
      );
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canRefund) return;
    if (mode === "partial" && (partialCents <= 0 || partialCents > remaining)) {
      setError(`Enter an amount between $0.01 and ${formatPrice(remaining)}.`);
      return;
    }
    setConfirmOpen(true);
  }

  return (
    <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
      <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
        Refunds
      </h2>
      <dl className="mt-3 space-y-2 text-body-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-on-surface-variant">Payment</dt>
          <dd className="text-on-surface">{paymentStatusDetail(order)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-on-surface-variant">Total paid</dt>
          <dd className="text-on-surface">{formatPrice(order.totalCents)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-on-surface-variant">Refunded</dt>
          <dd className="text-on-surface">
            {formatPrice(order.refundedCents ?? 0)}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-on-surface-variant">Refundable balance</dt>
          <dd className="text-on-surface">{formatPrice(remaining)}</dd>
        </div>
        {order.stripePaymentIntentId && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-on-surface-variant">Stripe PaymentIntent</dt>
            <dd className="break-all font-mono text-xs text-on-surface">
              {order.stripePaymentIntentId}
            </dd>
          </div>
        )}
      </dl>

      {ledger.length > 0 && (
        <div className="mt-4">
          <h3 className="font-label-sm uppercase text-on-surface-variant">
            Refund history
          </h3>
          <ul className="mt-2 space-y-2 text-body-sm">
            {ledger.map((entry) => (
              <li
                key={entry.refundId}
                className="border border-outline-variant/10 px-3 py-2"
              >
                <span className="text-on-surface">
                  {formatPrice(entry.amountCents)}
                </span>
                <span className="text-on-surface-variant">
                  {" "}
                  · {new Date(entry.createdAt).toLocaleString()} ·{" "}
                  {entry.source === "customer_cancel"
                    ? "customer cancellation"
                    : entry.source}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isStripe && (
        <p className="mt-4 text-body-sm text-on-surface-variant">
          Mock checkout orders: update payment status manually below. Stripe
          refunds are not available.
        </p>
      )}

      {canRefund && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-body-sm">
              <input
                type="radio"
                name="refundMode"
                checked={mode === "full"}
                onChange={() => setMode("full")}
              />
              Full remaining ({formatPrice(remaining)})
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <input
                type="radio"
                name="refundMode"
                checked={mode === "partial"}
                onChange={() => setMode("partial")}
              />
              Partial amount
            </label>
          </div>

          {mode === "partial" && (
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Amount (USD)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={partialDollars}
                onChange={(e) => setPartialDollars(e.target.value)}
                className="mt-1 w-full max-w-xs border border-outline-variant/30 bg-surface-container px-3 py-2"
                placeholder="0.00"
              />
            </label>
          )}

          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Stripe reason
            </span>
            <select
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as StripeRefundReason)
              }
              className="mt-1 w-full max-w-md border border-outline-variant/30 bg-surface-container px-3 py-2"
            >
              {STRIPE_REFUND_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Admin notes
            </span>
            <textarea
              value={refundNotes}
              onChange={(e) => setRefundNotes(e.target.value)}
              rows={2}
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
            Issue refund
          </button>
        </form>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-confirm-title"
        >
          <div className="max-w-md border border-outline-variant/30 bg-surface-container-high p-6 iron-bevel shadow-lg">
            <h3
              id="refund-confirm-title"
              className="font-headline-md uppercase text-on-surface"
            >
              Confirm refund
            </h3>
            <p className="mt-3 text-body-sm text-on-surface-variant">
              Issue a {mode === "full" ? "full" : "partial"} Stripe refund of{" "}
              <strong>{formatPrice(refundAmountCents)}</strong> for this order?
              This cannot be undone from the admin portal.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleRefund()}
                className="molten-glow border border-primary/40 bg-primary/10 px-4 py-2 font-label-sm uppercase text-primary disabled:opacity-50"
              >
                {submitting ? "Processing…" : "Confirm refund"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase text-on-surface-variant"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
