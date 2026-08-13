import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import type { OrderLineItemSnapshot } from "@/lib/orderLineItems";
import { formatPrice } from "@/data/seedProducts";
import { getStoredGuestSession } from "@/services/guestSessionService";

export type OrderRecord = Schema["Order"]["type"];

export type ShippingAddressSnapshot = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export function parseShippingAddress(
  shippingAddress: OrderRecord["shippingAddress"],
): ShippingAddressSnapshot | null {
  if (!shippingAddress) return null;

  try {
    const parsed =
      typeof shippingAddress === "string"
        ? JSON.parse(shippingAddress)
        : shippingAddress;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ShippingAddressSnapshot;
  } catch {
    return null;
  }
}

export function formatShippingAddress(
  address: ShippingAddressSnapshot | null,
): string {
  if (!address?.line1) return "—";

  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");

  return [
    address.name,
    address.line1,
    address.line2,
    cityLine,
    address.country,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseOrderLineItems(
  lineItems: OrderRecord["lineItems"],
): OrderLineItemSnapshot[] {
  if (!lineItems) return [];

  try {
    const parsed =
      typeof lineItems === "string" ? JSON.parse(lineItems) : lineItems;
    if (!Array.isArray(parsed)) return [];
    return (parsed as OrderLineItemSnapshot[]).map((item) => {
      if (item.printService || !item.printServiceJson) return item;
      try {
        const printService = JSON.parse(item.printServiceJson) as OrderLineItemSnapshot["printService"];
        return printService ? { ...item, printService } : item;
      } catch {
        return item;
      }
    });
  } catch {
    return [];
  }
}

export function formatOrderDate(createdAt: string | null | undefined): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type OrderStatus = NonNullable<OrderRecord["status"]>;

export const PAYMENT_STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
];

export function orderStatusLabel(
  status: OrderRecord["status"] | null | undefined,
): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    default:
      return "Unknown";
  }
}

/** Checkout failed before Stripe session creation — not a real order for customers. */
export function isOrphanedPendingCheckout(
  order: Pick<OrderRecord, "status" | "externalSessionId">,
): boolean {
  return (
    order.status === "pending" &&
    typeof order.externalSessionId === "string" &&
    order.externalSessionId.startsWith("pending_")
  );
}

export async function listCustomerOrders(
  client: AmplifyDataClient,
): Promise<OrderRecord[]> {
  const orders = await listAllOrders(client);
  return orders.filter((order) => !isOrphanedPendingCheckout(order));
}

/** Admin — paginated list of all orders. */
export async function listAllOrders(
  client: AmplifyDataClient,
): Promise<OrderRecord[]> {
  const rows: OrderRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Order.list({
      limit: 50,
      nextToken,
    });

    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }

    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }

    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });
}

export async function getOrderById(
  client: AmplifyDataClient,
  id: string,
): Promise<OrderRecord | null> {
  const { data, errors } = await client.models.Order.get({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data ?? null;
}

function mapGuestOrderItem(row: {
  id?: string | null;
  guestId?: string | null;
  externalSessionId: string;
  paymentProvider?: string | null;
  status: string;
  email?: string | null;
  customerName?: string | null;
  shippingAddress?: unknown;
  subtotalCents?: number | null;
  shippingCents?: number | null;
  shippingLabel?: string | null;
  taxCents?: number | null;
  lineItems?: unknown;
  totalCents: number;
  discountCents?: number | null;
  promoLabel?: string | null;
  fulfillmentStatus?: string | null;
  fulfillmentUpdatedAt?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  refundedCents?: number | null;
  refundNotes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}): OrderRecord | null {
  if (!row?.id) return null;
  return {
    id: row.id,
    guestId: row.guestId ?? null,
    userId: null,
    externalSessionId: row.externalSessionId,
    paymentProvider: (row.paymentProvider as OrderRecord["paymentProvider"]) ?? null,
    status: (row.status as OrderRecord["status"]) ?? "pending",
    email: row.email ?? null,
    customerName: row.customerName ?? null,
    customerPhone: null,
    shippingAddress: row.shippingAddress ?? null,
    subtotalCents: row.subtotalCents ?? null,
    shippingCents: row.shippingCents ?? null,
    shippingLabel: row.shippingLabel ?? null,
    taxCents: row.taxCents ?? null,
    lineItems: row.lineItems ?? null,
    totalCents: row.totalCents,
    discountCents: row.discountCents ?? null,
    promoGrantId: null,
    promoSource: null,
    promoLabel: row.promoLabel ?? null,
    promoExpiresAt: null,
    supportNotifiedAt: null,
    stripePaymentIntentId: null,
    adminAcknowledgedAt: null,
    fulfillmentStatus:
      (row.fulfillmentStatus as OrderRecord["fulfillmentStatus"]) ?? null,
    fulfillmentUpdatedAt: row.fulfillmentUpdatedAt ?? null,
    carrier: row.carrier ?? null,
    trackingNumber: row.trackingNumber ?? null,
    trackingUrl: row.trackingUrl ?? null,
    shippedAt: row.shippedAt ?? null,
    deliveredAt: row.deliveredAt ?? null,
    refundedCents: row.refundedCents ?? null,
    refundNotes: row.refundNotes ?? null,
    refunds: null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  } as OrderRecord;
}

/** M16e — list/get orders for the current guest session (HMAC). */
export async function listGuestOrders(
  client: AmplifyDataClient,
  orderId?: string,
): Promise<OrderRecord[]> {
  if (!client.queries.getGuestOrders) {
    throw new Error(
      "Guest orders are not available yet. Redeploy the Amplify backend.",
    );
  }

  const session = getStoredGuestSession();
  if (!session) {
    throw new Error("Guest session not ready — reload and try again.");
  }

  const { data, errors } = await client.queries.getGuestOrders({
    guestId: session.guestId,
    guestToken: session.guestToken,
    ...(orderId ? { orderId } : {}),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  const rows: OrderRecord[] = [];
  for (const row of data?.orders ?? []) {
    if (!row) continue;
    const mapped = mapGuestOrderItem(row);
    if (mapped) rows.push(mapped);
  }
  return rows;
}

export async function getGuestOrderById(
  client: AmplifyDataClient,
  id: string,
): Promise<OrderRecord | null> {
  const rows = await listGuestOrders(client, id);
  return rows[0] ?? null;
}

export async function updateOrderStatus(
  client: AmplifyDataClient,
  id: string,
  status: OrderStatus,
): Promise<OrderRecord> {
  const { data, errors } = await client.models.Order.update({ id, status });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Order update failed.");
  }
  return data;
}

export async function acknowledgeOrder(
  client: AmplifyDataClient,
  id: string,
): Promise<void> {
  const { errors } = await client.models.Order.update({
    id,
    adminAcknowledgedAt: new Date().toISOString(),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export async function acknowledgeOrders(
  client: AmplifyDataClient,
  ids: string[],
): Promise<void> {
  const timestamp = new Date().toISOString();
  for (const id of ids) {
    const { errors } = await client.models.Order.update({
      id,
      adminAcknowledgedAt: timestamp,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
  }
}

export function orderLineItemsSummary(items: OrderLineItemSnapshot[]): string {
  if (!items.length) return "No items";
  const count = items.reduce((n, item) => n + item.quantity, 0);
  const totalCents = items.reduce(
    (n, item) => n + item.priceCents * item.quantity,
    0,
  );
  return `${count} item${count === 1 ? "" : "s"} · ${formatPrice(totalCents)}`;
}
