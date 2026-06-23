import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OrderLineItemRow } from "@/components/OrderLineItemRow";
import { useProducts } from "@/hooks/useProducts";
import { formatPrice } from "@/data/seedProducts";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import { hasReviewModel } from "@/lib/dataModels";
import {
  formatOrderDate,
  listCustomerOrders,
  orderLineItemsSummary,
  orderStatusLabel,
  parseOrderLineItems,
  type OrderRecord,
} from "@/services/orderService";
import {
  displayFulfillmentStatus,
  fulfillmentStatusLabel,
} from "@/lib/orderFulfillment";
import { listMyReviews, type ReviewRecord } from "@/services/reviewService";

export function AccountOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewsEnabled, setReviewsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { products: catalogProducts, loading: catalogLoading } = useProducts("all");

  const reviewByOrderId = useMemo(
    () => new Map(reviews.map((review) => [review.orderId, review])),
    [reviews],
  );

  useEffect(() => {
    async function load() {
      const client = await requireCustomerSession(navigate, "/account/orders");
      if (!client) return;

      try {
        const orderRows = await listCustomerOrders(client);
        setOrders(orderRows);

        if (hasReviewModel(client)) {
          setReviewsEnabled(true);
          setReviews(await listMyReviews(client));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load orders",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate]);

  if (loading) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
        <p className="text-on-surface-variant">Loading orders...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
      <div className="mb-stack-lg flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Order History
        </h1>
        <Link
          to="/account"
          className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
        >
          ← Account
        </Link>
      </div>

      {error && <p className="text-error">{error}</p>}

      {!error && orders.length === 0 && (
        <p className="text-on-surface-variant">
          No orders yet.{" "}
          <Link to="/shop" className="text-primary underline">
            Browse the shop
          </Link>
        </p>
      )}

      <ul className="space-y-4">
        {orders.map((order) => {
          const items = parseOrderLineItems(order.lineItems);
          const review = reviewByOrderId.get(order.id);
          const canReview =
            reviewsEnabled && order.status === "paid" && !review;
          const fulfillment = displayFulfillmentStatus(order);
          return (
            <li
              key={order.id}
              className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-label-md text-on-surface">
                    <Link
                      to={`/account/orders/${order.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {formatOrderDate(order.createdAt)}
                    </Link>
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {orderStatusLabel(order.status)}
                    {fulfillment
                      ? ` · ${fulfillmentStatusLabel(fulfillment)}`
                      : ""}{" "}
                    · {order.paymentProvider ?? "mock"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-label-md text-primary">
                    {formatPrice(order.totalCents)}
                  </p>
                  <Link
                    to={`/account/orders/${order.id}`}
                    className="font-label-sm uppercase text-primary hover:underline"
                  >
                    View details
                  </Link>
                  {canReview && (
                    <Link
                      to={`/account/orders/${order.id}/review`}
                      className="font-label-sm uppercase text-primary hover:underline"
                    >
                      Review
                    </Link>
                  )}
                  {review && (
                    <span className="font-label-sm uppercase text-on-surface-variant">
                      {review.approved ? "Review published" : "Review pending"}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-label-sm text-on-surface-variant">
                {orderLineItemsSummary(items)}
              </p>
              {order.externalSessionId && (
                <p className="mt-1 font-label-sm text-on-surface-variant/80">
                  Ref: {order.externalSessionId}
                </p>
              )}
              {items.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-outline-variant/10 pt-3">
                  {items.map((item, index) => (
                    <li key={`${order.id}-${index}`}>
                      <OrderLineItemRow
                        item={item}
                        products={catalogProducts}
                        catalogLoaded={!catalogLoading}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
