import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import type { OrderLineItemSnapshot } from "@/lib/orderLineItems";
import { formatPrice } from "@/data/seedProducts";

export type OrderRecord = Schema["Order"]["type"];

export function parseOrderLineItems(
  lineItems: OrderRecord["lineItems"],
): OrderLineItemSnapshot[] {
  if (!lineItems) return [];

  try {
    const parsed =
      typeof lineItems === "string" ? JSON.parse(lineItems) : lineItems;
    if (!Array.isArray(parsed)) return [];
    return parsed as OrderLineItemSnapshot[];
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
    default:
      return "Unknown";
  }
}

export async function listCustomerOrders(
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

export function orderLineItemsSummary(items: OrderLineItemSnapshot[]): string {
  if (!items.length) return "No items";
  const count = items.reduce((n, item) => n + item.quantity, 0);
  const totalCents = items.reduce(
    (n, item) => n + item.priceCents * item.quantity,
    0,
  );
  return `${count} item${count === 1 ? "" : "s"} · ${formatPrice(totalCents)}`;
}
