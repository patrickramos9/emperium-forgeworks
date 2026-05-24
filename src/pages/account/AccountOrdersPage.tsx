import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import {
  formatOrderDate,
  listCustomerOrders,
  orderLineItemsSummary,
  orderStatusLabel,
  parseOrderLineItems,
  type OrderRecord,
} from "@/services/orderService";

export function AccountOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const client = await requireCustomerSession(navigate, "/account/orders");
      if (!client) return;

      try {
        setOrders(await listCustomerOrders(client));
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
          return (
            <li
              key={order.id}
              className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-label-md text-on-surface">
                    {formatOrderDate(order.createdAt)}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {orderStatusLabel(order.status)} ·{" "}
                    {order.paymentProvider ?? "mock"}
                  </p>
                </div>
                <p className="font-label-md text-primary">
                  {formatPrice(order.totalCents)}
                </p>
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
                <ul className="mt-3 space-y-1 border-t border-outline-variant/10 pt-3">
                  {items.map((item, index) => (
                    <li
                      key={`${order.id}-${index}`}
                      className="flex justify-between gap-4 text-label-sm text-on-surface-variant"
                    >
                      <span>
                        {item.title} × {item.quantity}
                      </span>
                      <span>
                        {formatPrice(item.priceCents * item.quantity)}
                      </span>
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
