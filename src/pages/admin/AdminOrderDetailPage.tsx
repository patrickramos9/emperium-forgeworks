import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
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

const STATUS_OPTIONS: OrderStatus[] = ["pending", "paid", "failed"];

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [status, setStatus] = useState<OrderStatus>("paid");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        if (row.status) setStatus(row.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load order");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, navigate]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!order || !id) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }

    try {
      const updated = await updateOrderStatus(client, id, status);
      setOrder(updated);
      setMessage("Order updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
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
        <DetailRow label="Status" value={orderStatusLabel(order.status)} />
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
        {order.userId && (
          <DetailRow label="Customer ID" value={order.userId} />
        )}
        {order.email && <DetailRow label="Email" value={order.email} />}
        {order.customerName && (
          <DetailRow label="Name" value={order.customerName} />
        )}
        {order.customerPhone && (
          <DetailRow label="Phone" value={order.customerPhone} />
        )}
      </dl>

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
              No shipping address recorded (order placed before shipping
              collection was enabled).
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
        onSubmit={(e) => void handleSave(e)}
        className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
      >
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Update status
        </h2>
        <label className="mt-4 block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Fulfillment status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
          >
            {STATUS_OPTIONS.map((option) => (
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
          disabled={saving}
          className="molten-glow mt-4 bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save status"}
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
