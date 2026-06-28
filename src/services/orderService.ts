import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import type { OrderLineItemSnapshot } from "@/lib/orderLineItems";
import { formatPrice } from "@/data/seedProducts";

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
