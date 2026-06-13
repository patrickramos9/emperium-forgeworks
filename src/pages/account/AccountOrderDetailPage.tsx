import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { OrderFulfillmentTimeline } from "@/components/OrderFulfillmentTimeline";
import { formatPrice } from "@/data/seedProducts";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import { getCustomerUserId } from "@/lib/customerAuth";
import {
  buildTrackingUrl,
  displayFulfillmentStatus,
  fulfillmentStatusLabel,
} from "@/lib/orderFulfillment";
import {
  formatOrderDate,
  formatShippingAddress,
  getOrderById,
  orderStatusLabel,
  parseOrderLineItems,
  parseShippingAddress,
  type OrderRecord,
} from "@/services/orderService";

export function AccountOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      try {
        const userId = await getCustomerUserId();
        const row = await getOrderById(client, orderId);
        if (!row || row.userId !== userId) {
          setError("Order not found.");
          return;
        }
        setOrder(row);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load order");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orderId, navigate]);

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
        {formatOrderDate(order.createdAt)} · {orderStatusLabel(order.status)}
        {fulfillment ? ` · ${fulfillmentStatusLabel(fulfillment)}` : ""}
      </p>

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Order status
        </h2>
        <div className="mt-3">
          <OrderFulfillmentTimeline order={order} />
        </div>
      </section>

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
        <ul className="mt-3 space-y-2 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          {items.map((item, index) => (
            <li
              key={`${item.productId}-${index}`}
              className="flex justify-between gap-4 text-body-md"
            >
              <span>
                {item.title} × {item.quantity}
              </span>
              <span className="text-primary">
                {formatPrice(item.priceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {order.status === "paid" && (
        <Link
          to={`/account/orders/${order.id}/review`}
          className="mt-6 inline-block font-label-sm uppercase text-primary hover:underline"
        >
          Leave a review
        </Link>
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
