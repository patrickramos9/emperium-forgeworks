import type { generateClient } from "aws-amplify/data";
import type { Schema } from "../../data/resource";

type DataClient = ReturnType<typeof generateClient<Schema>>;
type OrderRecord = Schema["Order"]["type"];
type OrderStatus = NonNullable<OrderRecord["status"]>;

export type RefundLedgerEntry = {
  refundId: string;
  amountCents: number;
  reason?: string | null;
  createdAt: string;
  source: "admin" | "webhook" | "customer_cancel";
};

const RETURN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function parseRefundLedger(
  raw: OrderRecord["refunds"],
): RefundLedgerEntry[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed as RefundLedgerEntry[];
  } catch {
    return [];
  }
}

export function refundableCentsRemaining(order: OrderRecord): number {
  const refunded = order.refundedCents ?? 0;
  return Math.max(0, order.totalCents - refunded);
}

export function deriveOrderStatusAfterRefund(
  order: OrderRecord,
  refundedCents: number,
): OrderStatus {
  if (refundedCents >= order.totalCents) return "refunded";
  if (order.status === "refunded" && refundedCents < order.totalCents) {
    return "paid";
  }
  return order.status === "refunded" ? "refunded" : "paid";
}

export function mergeRefundEntry(
  existing: RefundLedgerEntry[],
  entry: RefundLedgerEntry,
): RefundLedgerEntry[] {
  if (existing.some((row) => row.refundId === entry.refundId)) {
    return existing;
  }
  return [...existing, entry].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export async function applyRefundToOrder(
  client: DataClient,
  orderId: string,
  input: {
    refundedCents: number;
    entry?: RefundLedgerEntry;
    refundNotes?: string;
  },
): Promise<OrderRecord | null> {
  const order = await client.models.Order.get({ id: orderId });
  if (order.errors?.length) {
    throw new Error(order.errors.map((e) => e.message).join("; "));
  }
  if (!order.data) return null;

  const row = order.data;
  const ledger = parseRefundLedger(row.refunds);
  const nextLedger = input.entry
    ? mergeRefundEntry(ledger, input.entry)
    : ledger;
  const refundedCents = Math.min(
    row.totalCents,
    Math.max(input.refundedCents, row.refundedCents ?? 0),
  );
  const status = deriveOrderStatusAfterRefund(row, refundedCents);

  const { data, errors } = await client.models.Order.update({
    id: orderId,
    refundedCents,
    status,
    refunds: JSON.stringify(nextLedger),
    ...(input.refundNotes !== undefined ? { refundNotes: input.refundNotes } : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data ?? null;
}

export function returnWindowStartIso(order: OrderRecord): string | null {
  if (order.deliveredAt) return order.deliveredAt;
  if (order.fulfillmentStatus === "shipped" && order.shippedAt) {
    return order.shippedAt;
  }
  return null;
}

export function isWithinReturnWindow(
  order: OrderRecord,
  nowMs = Date.now(),
): boolean {
  const startIso = returnWindowStartIso(order);
  if (!startIso) return false;
  const startMs = Date.parse(startIso);
  if (Number.isNaN(startMs)) return false;
  return nowMs - startMs <= RETURN_WINDOW_MS;
}

export function canCustomerRequestReturn(order: OrderRecord): boolean {
  if (order.status !== "paid") return false;
  if (orderHasShipped(order)) return false;
  return isWithinReturnWindow(order);
}

export function orderHasShipped(order: OrderRecord): boolean {
  if (order.fulfillmentStatus === "shipped") return true;
  if (order.shippedAt) return true;
  return false;
}

export function canCustomerCancelOrder(order: OrderRecord): boolean {
  if (order.status !== "paid") return false;
  if (orderHasShipped(order)) return false;
  return refundableCentsRemaining(order) > 0;
}

export function assertCustomerCanCancelOrder(
  order: OrderRecord,
  userId: string,
): void {
  if (order.userId !== userId) {
    throw new Error("Order not found.");
  }
  if (!canCustomerCancelOrder(order)) {
    throw new Error(
      "This order cannot be cancelled. Only paid orders that have not shipped may be cancelled from your account.",
    );
  }
}

