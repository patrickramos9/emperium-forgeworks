import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import { OrderCustomerSummary } from "@/components/admin/OrderCustomerSummary";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  buildOrderCustomerDisplay,
} from "@/lib/adminOrderCustomer";
import { resolveCustomerLabelsForUserIds } from "@/lib/customerAdmin";
import {
  formatOrderDate,
  listAllOrders,
  orderLineItemsSummary,
  orderStatusLabel,
  parseOrderLineItems,
  type OrderRecord,
} from "@/services/orderService";

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [customerLabels, setCustomerLabels] = useState<
    Awaited<ReturnType<typeof resolveCustomerLabelsForUserIds>>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const client = await requireAdminSession(navigate);
      if (!client) return;

      try {
        const rows = await listAllOrders(client);
        setOrders(rows);

        const userIds = [
          ...new Set(rows.map((order) => order.userId).filter(Boolean) as string[]),
        ];
        setCustomerLabels(
          userIds.length
            ? await resolveCustomerLabelsForUserIds(client, userIds)
            : new Map(),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load orders");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate]);

  const customerByOrderId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildOrderCustomerDisplay>>();
    for (const order of orders) {
      const label = order.userId ? customerLabels.get(order.userId) : undefined;
      map.set(order.id, buildOrderCustomerDisplay(order, label));
    }
    return map;
  }, [orders, customerLabels]);

  if (loading) {
    return <p className="text-on-surface-variant">Loading orders...</p>;
  }

  return (
    <div className="mx-auto max-w-container-max">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Orders
      </h1>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Fulfillment queue — all storefront orders
      </p>

      {error && <p className="mt-4 text-error">{error}</p>}

      {!error && orders.length === 0 && (
        <p className="mt-stack-lg text-on-surface-variant">
          No orders yet. Mock checkout on the storefront creates orders here.
        </p>
      )}

      {!error && orders.length > 0 && (
        <div className="mt-stack-lg overflow-x-auto border border-outline-variant/20 iron-bevel">
          <table className="w-full text-left text-body-md">
            <thead className="bg-surface-container-high font-label-sm uppercase text-on-surface-variant">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Status</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Total</th>
                <th className="p-3">Summary</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const items = parseOrderLineItems(order.lineItems);
                return (
                  <tr
                    key={order.id}
                    className="border-t border-outline-variant/10"
                  >
                    <td className="p-3 text-on-surface">
                      {formatOrderDate(order.createdAt)}
                    </td>
                    <td className="p-3">
                      <OrderCustomerSummary
                        customer={
                          customerByOrderId.get(order.id) ??
                          buildOrderCustomerDisplay(order)
                        }
                      />
                    </td>
                    <td className="p-3">{orderStatusLabel(order.status)}</td>
                    <td className="p-3 text-on-surface-variant">
                      {order.paymentProvider ?? "—"}
                    </td>
                    <td className="p-3 text-primary">
                      {formatPrice(order.totalCents)}
                    </td>
                    <td className="p-3 text-label-sm text-on-surface-variant">
                      {orderLineItemsSummary(items)}
                    </td>
                    <td className="p-3">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="text-primary hover:underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
