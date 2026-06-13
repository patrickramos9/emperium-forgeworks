import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { OrderFulfillmentTimeline } from "@/components/OrderFulfillmentTimeline";
import { formatPrice } from "@/data/seedProducts";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  buildOrderCustomerDisplay,
  missingShippingAddressMessage,
} from "@/lib/adminOrderCustomer";
import { resolveCustomerLabelsForUserIds, type CustomerLabel } from "@/lib/customerAdmin";
import { isUnacknowledgedPaidOrder } from "@/lib/adminOrderStats";
import {
  CARRIER_OPTIONS,
  canAdvanceFulfillment,
  displayFulfillmentStatus,
  effectiveFulfillmentStatus,
  fulfillmentStatusLabel,
  nextFulfillmentStatus,
  type FulfillmentStatus,
} from "@/lib/orderFulfillment";
import {
  acknowledgeOrder,
  formatOrderDate,
  formatShippingAddress,
  getOrderById,
  orderStatusLabel,
  parseOrderLineItems,
  parseShippingAddress,
  updateOrderStatus,
  type OrderRecord,
  type OrderStatus,
} from "@/services/orderService";
import { updateOrderFulfillment } from "@/services/orderFulfillmentService";

const PAYMENT_STATUS_OPTIONS: OrderStatus[] = ["pending", "paid", "failed"];

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [customerLabel, setCustomerLabel] = useState<CustomerLabel | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<OrderStatus>("paid");
  const [carrier, setCarrier] = useState("USPS");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [advancingFulfillment, setAdvancingFulfillment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const nextStage = useMemo(
    () =>
      order
        ? nextFulfillmentStatus(
            effectiveFulfillmentStatus(order) ??
              displayFulfillmentStatus(order),
          )
        : null,
    [order],
  );

  useEffect(() => {
    async function load() {
      if (!id) {
        navigate("/admin/orders");
        return;
      }

      const client = await requireAdminSession(navigate);
      if (!client) return;

      try {
        const row = await getOrderById(client, id);
        if (!row) {
          navigate("/admin/orders");
          return;
        }
        setOrder(row);
        if (row.status) setPaymentStatus(row.status);
        setCarrier(row.carrier ?? "USPS");
        setTrackingNumber(row.trackingNumber ?? "");
        setTrackingUrl(row.trackingUrl ?? "");

        if (row.userId) {
          const labels = await resolveCustomerLabelsForUserIds(client, [
            row.userId,
          ]);
          setCustomerLabel(labels.get(row.userId) ?? null);
        } else {
          setCustomerLabel(null);
        }

        if (isUnacknowledgedPaidOrder(row)) {
          try {
            await acknowledgeOrder(client, row.id);
            let updated = {
              ...row,
              adminAcknowledgedAt: new Date().toISOString(),
            };

            const afterAck = nextFulfillmentStatus(
              effectiveFulfillmentStatus(row) ?? displayFulfillmentStatus(row),
            );
            if (
              afterAck === "received" &&
              canAdvanceFulfillment(
                effectiveFulfillmentStatus(row),
                "received",
                row.status,
              )
            ) {
              const result = await updateOrderFulfillment(client, {
                orderId: row.id,
                fulfillmentStatus: "received",
              });
              updated = {
                ...updated,
                fulfillmentStatus: result.fulfillmentStatus as FulfillmentStatus,
              };
            }

            setOrder(updated);
          } catch {
            /* dashboard badge is best-effort */
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load order");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, navigate]);

  async function handleSavePayment(e: FormEvent) {
    e.preventDefault();
    if (!order || !id) return;

    setSavingPayment(true);
    setError(null);
    setMessage(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setSavingPayment(false);
      return;
    }

    try {
      const updated = await updateOrderStatus(client, id, paymentStatus);
      setOrder(updated);
      setMessage("Payment status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleAdvanceFulfillment() {
    if (!order || !id || !nextStage) return;

    setAdvancingFulfillment(true);
    setError(null);
    setMessage(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setAdvancingFulfillment(false);
      return;
    }

    try {
      const result = await updateOrderFulfillment(client, {
        orderId: id,
        fulfillmentStatus: nextStage,
        ...(nextStage === "shipped"
          ? {
              carrier,
              trackingNumber,
              trackingUrl: trackingUrl.trim() || undefined,
            }
          : {}),
      });

      const refreshed = await getOrderById(client, id);
      if (refreshed) setOrder(refreshed);

      const parts = [
        `Fulfillment updated to ${fulfillmentStatusLabel(result.fulfillmentStatus as FulfillmentStatus)}.`,
      ];
      if (result.notificationSent) parts.push("Customer notified in-app.");
      if (result.emailSent) parts.push("Customer email sent.");
      setMessage(parts.join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fulfillment update failed");
    } finally {
      setAdvancingFulfillment(false);
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading order...</p>;
  }

  if (!order) {
    return null;
  }

  const items = parseOrderLineItems(order.lineItems);
  const shipping = parseShippingAddress(order.shippingAddress);
  const shippingLines = formatShippingAddress(shipping).split("\n");
  const customer = buildOrderCustomerDisplay(order, customerLabel);
  const fulfillment = displayFulfillmentStatus(order);
  const canAdvance =
    nextStage != null &&
    canAdvanceFulfillment(
      effectiveFulfillmentStatus(order),
      nextStage,
      order.status,
    );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/admin/orders"
        className="font-label-sm uppercase text-primary hover:underline"
      >
        ← Orders
      </Link>

      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        Order detail
      </h1>

      <dl className="mt-stack-lg space-y-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
        <DetailRow label="Date" value={formatOrderDate(order.createdAt)} />
        <DetailRow label="Payment" value={orderStatusLabel(order.status)} />
        <DetailRow
          label="Fulfillment"
          value={fulfillment ? fulfillmentStatusLabel(fulfillment) : "—"}
        />
        <DetailRow
          label="Provider"
          value={order.paymentProvider ?? "—"}
        />
        {order.subtotalCents != null && (
          <DetailRow
            label="Subtotal"
            value={formatPrice(order.subtotalCents)}
          />
        )}
        {order.discountCents != null && order.discountCents > 0 && (
          <DetailRow
            label={
              order.promoLabel
                ? `Promo (${order.promoLabel})`
                : "Promo discount"
            }
            value={`−${formatPrice(order.discountCents)}`}
          />
        )}
        {order.promoSource && (
          <DetailRow label="Promo source" value={order.promoSource} />
        )}
        {order.shippingCents != null && (
          <DetailRow
            label={
              order.shippingLabel
                ? `Shipping (${order.shippingLabel})`
                : "Shipping"
            }
            value={formatPrice(order.shippingCents)}
          />
        )}
        <DetailRow label="Total charged" value={formatPrice(order.totalCents)} />
        <DetailRow
          label="Session ref"
          value={order.externalSessionId}
        />
      </dl>

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Customer fulfillment
        </h2>
        <div className="mt-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          <p className="text-body-sm text-on-surface-variant">
            Customer-facing progress (separate from payment status below). Use
            the button to advance one step at a time.
          </p>
          <div className="mt-3">
            <OrderFulfillmentTimeline order={order} />
          </div>
          {order.status !== "paid" ? (
            <p className="mt-3 text-body-sm text-on-surface-variant">
              Fulfillment updates are available after payment is complete.
            </p>
          ) : (
            <>
              {nextStage === "shipped" && (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="font-label-sm uppercase text-on-surface-variant">
                      Carrier
                    </span>
                    <select
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
                    >
                      {CARRIER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-label-sm uppercase text-on-surface-variant">
                      Tracking number
                    </span>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="font-label-sm uppercase text-on-surface-variant">
                      Tracking URL (optional)
                    </span>
                    <input
                      type="url"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="https://…"
                      className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
                    />
                  </label>
                </div>
              )}
              {canAdvance && nextStage && (
                <button
                  type="button"
                  disabled={advancingFulfillment}
                  onClick={() => void handleAdvanceFulfillment()}
                  className="molten-glow mt-4 bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
                >
                  {advancingFulfillment
                    ? "Updating..."
                    : `Mark as ${fulfillmentStatusLabel(nextStage)}`}
                </button>
              )}
              {!canAdvance && fulfillment && fulfillment !== "shipped" && (
                <p className="mt-3 text-body-sm text-on-surface-variant">
                  Customer status is{" "}
                  <strong>{fulfillmentStatusLabel(fulfillment)}</strong>.
                  {nextStage
                    ? ` Deploy the latest backend to advance to ${fulfillmentStatusLabel(nextStage)}.`
                    : ""}
                </p>
              )}
              {!canAdvance && !fulfillment && order.status === "paid" && (
                <p className="mt-3 text-body-sm text-on-surface-variant">
                  Deploy the latest <strong>backend</strong> (M11) to enable
                  fulfillment updates. The payment dropdown below does not
                  change customer order status.
                </p>
              )}
              {fulfillment === "shipped" && order.trackingNumber && (
                <p className="mt-3 text-body-sm text-on-surface-variant">
                  Shipped via {order.carrier ?? "carrier"} — {order.trackingNumber}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Customer
        </h2>
        <dl className="mt-3 space-y-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          <DetailRow
            label="Email"
            value={customer.email ?? "—"}
          />
          {customer.checkoutName && (
            <DetailRow label="Checkout name" value={customer.checkoutName} />
          )}
          {customer.accountName && (
            <DetailRow label="Account name" value={customer.accountName} />
          )}
          {customer.isRegistered &&
            customer.accountEmail &&
            customer.accountEmail !== customer.email && (
            <DetailRow label="Account email" value={customer.accountEmail} />
          )}
          <DetailRow
            label="Checkout type"
            value={customer.isRegistered ? "Signed-in customer" : "Guest"}
          />
          {customer.phone && (
            <DetailRow label="Phone" value={customer.phone} />
          )}
          {customer.awaitingCheckoutDetails && (
            <p className="text-body-sm text-on-surface-variant">
              Contact and shipping details are collected during Stripe checkout
              and appear here once payment completes.
            </p>
          )}
        </dl>
      </section>

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Ship to
        </h2>
        <div className="mt-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          {shipping?.line1 ? (
            <address className="space-y-0.5 whitespace-pre-line not-italic text-on-surface">
              {shippingLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          ) : (
            <p className="text-on-surface-variant">
              {missingShippingAddressMessage(order.status)}
            </p>
          )}
        </div>
      </section>

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Line items
        </h2>
        <ul className="mt-3 space-y-2 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          {items.length === 0 && (
            <li className="text-on-surface-variant">No line items recorded.</li>
          )}
          {items.map((item, index) => (
            <li
              key={`${item.productId}-${index}`}
              className="flex justify-between gap-4 text-body-md"
            >
              <span className="text-on-surface">
                {item.title} × {item.quantity}
              </span>
              <span className="text-primary">
                {formatPrice(item.priceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <form
        onSubmit={(e) => void handleSavePayment(e)}
        className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
      >
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Payment status
        </h2>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          Stripe / checkout payment only (Pending, Paid, Failed). To update what
          the <strong>customer</strong> sees (Received → Processing → Shipped),
          use <strong>Customer fulfillment</strong> above — not this dropdown.
        </p>
        <label className="mt-4 block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Payment status
          </span>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as OrderStatus)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {orderStatusLabel(option)}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="mt-3 text-error">{error}</p>}
        {message && <p className="mt-3 text-on-surface-variant">{message}</p>}
        <button
          type="submit"
          disabled={savingPayment}
          className="molten-glow mt-4 border border-outline-variant/30 bg-surface-container px-6 py-3 font-label-md uppercase text-primary disabled:opacity-50"
        >
          {savingPayment ? "Saving..." : "Save payment status"}
        </button>
      </form>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="font-label-sm uppercase text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-on-surface">{value}</dd>
    </div>
  );
}
