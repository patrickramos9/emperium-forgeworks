import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { OrderFulfillmentTimeline } from "@/components/OrderFulfillmentTimeline";
import { PrintOrderReviewStatus } from "@/components/PrintOrderReviewStatus";
import { OrderLineItemRow } from "@/components/OrderLineItemRow";
import { formatPrice } from "@/data/seedProducts";
import { RETURN_SHIP_INSTRUCTIONS } from "@/lib/config";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import { getCustomerUserId } from "@/lib/customerAuth";
import {
  buildTrackingUrl,
  displayFulfillmentStatus,
  fulfillmentStatusLabel,
} from "@/lib/orderFulfillment";
import {
  canCustomerCancelOrder,
  canCustomerRequestReturn,
  isCustomerCancelledOrder,
  isFullyRefunded,
  paymentStatusDetail,
  RETURN_STATUS_LABELS,
  showFulfillmentProgress,
} from "@/lib/orderRefunds";
import { cancelCustomerOrder } from "@/services/cancelOrderService";
import {
  formatOrderDate,
  formatShippingAddress,
  getOrderById,
  isOrphanedPendingCheckout,
  parseOrderLineItems,
  parseShippingAddress,
  type OrderRecord,
} from "@/services/orderService";
import {
  listReturnRequestsForOrder,
  type ReturnRequestRecord,
} from "@/services/returnRequestService";

export function AccountOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [dataClient, setDataClient] = useState<AmplifyDataClient | null>(null);
  const [returnRequests, setReturnRequests] = useState<ReturnRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const { products: catalogProducts, loading: catalogLoading } = useProducts("all");

  async function reloadOrder(client: AmplifyDataClient, id: string) {
    const row = await getOrderById(client, id);
    if (row) {
      setOrder(row);
      setReturnRequests(await listReturnRequestsForOrder(client, id));
    }
    return row;
  }

  useEffect(() => {
    async function load() {
      if (!orderId) {
        navigate("/account/orders");
        return;
      }

      const client = await requireCustomerSession(
        navigate,
        `/account/orders/${orderId}`,
      );
      if (!client) return;
      setDataClient(client);

      try {
        const userId = await getCustomerUserId();
        const row = await getOrderById(client, orderId);
        if (!row || row.userId !== userId || isOrphanedPendingCheckout(row)) {
          setError("Order not found.");
          return;
        }
        setOrder(row);
        setReturnRequests(await listReturnRequestsForOrder(client, orderId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load order");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orderId, navigate]);

  async function handleCancelOrder() {
    if (!dataClient || !order) return;
    setCancelling(true);
    setCancelError(null);
    setCancelMessage(null);
    try {
      await cancelCustomerOrder(dataClient, order.id);
      await reloadOrder(dataClient, order.id);
      setCancelMessage(
        "Your order was cancelled. A full refund will return to your original payment method (timing depends on your bank or card issuer).",
      );
      setCancelConfirmOpen(false);
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Could not cancel order.",
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
        <p className="text-on-surface-variant">Loading order...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
        <p className="text-error">{error ?? "Order not found."}</p>
        <Link
          to="/account/orders"
          className="mt-4 inline-block font-label-sm uppercase text-primary hover:underline"
        >
          ← Order history
        </Link>
      </main>
    );
  }

  const items = parseOrderLineItems(order.lineItems);
  const shipping = parseShippingAddress(order.shippingAddress);
  const fulfillment = displayFulfillmentStatus(order);
  const trackingUrl = buildTrackingUrl(
    order.carrier,
    order.trackingNumber,
    order.trackingUrl,
  );
  const openReturn = returnRequests.find((row) =>
    ["requested", "approved", "received"].includes(row.status ?? ""),
  );
  const canRequestReturn = canCustomerRequestReturn(order) && !openReturn;
  const canCancel = canCustomerCancelOrder(order);
  const wasCancelled = isCustomerCancelledOrder(order);
  const wasRefunded = isFullyRefunded(order);

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
      <div className="mb-stack-lg flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Order details
        </h1>
        <Link
          to="/account/orders"
          className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
        >
          ← Order history
        </Link>
      </div>

      <p className="text-on-surface-variant">
        {formatOrderDate(order.createdAt)} · {paymentStatusDetail(order)}
        {fulfillment && showFulfillmentProgress(order)
          ? ` · ${fulfillmentStatusLabel(fulfillment)}`
          : ""}
      </p>

      {wasRefunded && (
        <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          <p className="text-body-sm text-on-surface">
            {wasCancelled
              ? "This order was cancelled before shipment."
              : "This order was refunded."}{" "}
            {order.refundedCents != null && order.refundedCents > 0
              ? `${formatPrice(order.refundedCents)} returned to your original payment method (timing depends on your bank or card issuer).`
              : ""}
          </p>
        </section>
      )}

      {cancelMessage && (
        <p className="mt-stack-lg text-body-sm text-on-surface-variant">
          {cancelMessage}
        </p>
      )}

      {openReturn && (
        <section className="mt-stack-lg border border-primary/30 bg-surface-container-low p-4 iron-bevel">
          <h2 className="font-headline-md text-headline-md uppercase text-primary">
            Return request
          </h2>
          <p className="mt-2 text-body-sm text-on-surface">
            Status:{" "}
            <strong>
              {RETURN_STATUS_LABELS[openReturn.status ?? "requested"]}
            </strong>
          </p>
          {openReturn.status === "approved" && (
            <p className="mt-2 text-body-sm text-on-surface-variant">
              {RETURN_SHIP_INSTRUCTIONS}
            </p>
          )}
          {openReturn.adminNotes && (
            <p className="mt-2 text-body-sm text-on-surface">
              {openReturn.adminNotes}
            </p>
          )}
          <Link
            to={`/account/orders/${order.id}/return`}
            className="mt-3 inline-block font-label-sm uppercase text-primary hover:underline"
          >
            View return details
          </Link>
        </section>
      )}

      {canCancel && (
        <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            Cancel order
          </h2>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            This order has not shipped yet. You may cancel for a full refund to
            your original payment method.
          </p>
          {cancelError && <p className="mt-2 text-error">{cancelError}</p>}
          <button
            type="button"
            onClick={() => setCancelConfirmOpen(true)}
            className="mt-4 border border-outline-variant/30 bg-surface-container px-6 py-3 font-label-md uppercase text-error hover:border-error/50"
          >
            Cancel order
          </button>
        </section>
      )}

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Order status
        </h2>
        <div className="mt-3">
          <OrderFulfillmentTimeline order={order} />
        </div>
      </section>

      <PrintOrderReviewStatus items={items} order={order} />

      {fulfillment === "shipped" && (order.trackingNumber || trackingUrl) && (
        <section className="mt-stack-lg border border-primary/30 bg-surface-container-low p-4 iron-bevel">
          <h2 className="font-headline-md text-headline-md uppercase text-primary">
            Tracking
          </h2>
          <p className="mt-2 text-on-surface">
            {order.carrier && (
              <span className="block">
                Carrier: <strong>{order.carrier}</strong>
              </span>
            )}
            {order.trackingNumber && (
              <span className="mt-1 block">
                Tracking number: <strong>{order.trackingNumber}</strong>
              </span>
            )}
          </p>
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-label-sm uppercase text-primary underline"
            >
              Track package
            </a>
          )}
        </section>
      )}

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Summary
        </h2>
        <dl className="mt-3 space-y-2 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          {order.subtotalCents != null && (
            <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
          )}
          {order.discountCents != null && order.discountCents > 0 && (
            <Row
              label="Promo"
              value={`−${formatPrice(order.discountCents)}`}
            />
          )}
          {order.shippingCents != null && (
            <Row label="Shipping" value={formatPrice(order.shippingCents)} />
          )}
          {order.taxCents != null && order.taxCents > 0 && (
            <Row label="Sales tax" value={formatPrice(order.taxCents)} />
          )}
          <Row label="Total" value={formatPrice(order.totalCents)} />
        </dl>
      </section>

      {shipping?.line1 && (
        <section className="mt-stack-lg">
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            Ship to
          </h2>
          <address className="mt-3 whitespace-pre-line not-italic border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel text-on-surface">
            {formatShippingAddress(shipping)}
          </address>
        </section>
      )}

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Items
        </h2>
        <ul className="mt-3 space-y-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          {items.map((item, index) => (
            <li key={`${item.productId}-${index}`}>
              <OrderLineItemRow
                item={item}
                products={catalogProducts}
                catalogLoaded={!catalogLoading}
              />
            </li>
          ))}
        </ul>
      </section>

      {order.status === "paid" && showFulfillmentProgress(order) && (
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            to={`/account/orders/${order.id}/review`}
            className="font-label-sm uppercase text-primary hover:underline"
          >
            Leave a review
          </Link>
          {(canRequestReturn || openReturn) && (
            <Link
              to={`/account/orders/${order.id}/return`}
              className="font-label-sm uppercase text-primary hover:underline"
            >
              {openReturn ? "Return details" : "Request a return"}
            </Link>
          )}
        </div>
      )}

      {cancelConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-title"
        >
          <div className="max-w-md border border-outline-variant/30 bg-surface-container-high p-6 iron-bevel shadow-lg">
            <h3
              id="cancel-order-title"
              className="font-headline-md uppercase text-on-surface"
            >
              Cancel this order?
            </h3>
            <p className="mt-3 text-body-sm text-on-surface-variant">
              We will issue a full refund of{" "}
              <strong>{formatPrice(order.totalCents)}</strong> to your original
              payment method. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void handleCancelOrder()}
                className="border border-error/40 bg-error/10 px-4 py-2 font-label-sm uppercase text-error disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Yes, cancel order"}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelConfirmOpen(false)}
                className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase text-on-surface-variant"
              >
                Keep order
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="text-on-surface">{value}</dd>
    </div>
  );
}
