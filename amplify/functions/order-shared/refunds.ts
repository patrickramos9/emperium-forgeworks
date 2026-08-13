import type { Schema } from "../../data/resource";
import type { OrderSharedDataClient } from "./dataClient.js";

type DataClient = OrderSharedDataClient;
type OrderRecord = Schema["Order"]["type"];
type OrderStatus = NonNullable<OrderRecord["status"]>;

export type RefundLedgerEntry = {
  refundId: string;
  amountCents: number;
  reason?: string | null;
  createdAt: string;
  source: "admin" | "webhook" | "customer_cancel" | "print_reject";
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
    throw new Error(
      order.errors.map((e: { message: string }) => e.message).join("; "),
    );
  }
  if (!order.data) return null;

  const row = order.data as OrderRecord;
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
    throw new Error(errors.map((e: { message: string }) => e.message).join("; "));
  }
  return (data as OrderRecord | null | undefined) ?? null;
}

export function returnWindowStartIso(order: OrderRecord): string | null {
  if (order.deliveredAt) return order.deliveredAt;
  if (order.shippedAt) return order.shippedAt;
  if (order.fulfillmentStatus === "shipped" && order.fulfillmentUpdatedAt) {
    return order.fulfillmentUpdatedAt;
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
  if (!orderHasShipped(order)) return false;
  return isWithinReturnWindow(order);
}

export function returnIneligibilityReason(order: OrderRecord): string | null {
  if (order.status !== "paid") {
    return "Only paid orders are eligible for returns.";
  }
  if (!orderHasShipped(order)) {
    return "This order has not shipped yet. Cancel it from order details for a full refund before shipment.";
  }
  if (!isWithinReturnWindow(order)) {
    return "The 30-day return window from delivery has expired for this order.";
  }
  return null;
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
  identity: { userId?: string; guestId?: string },
): void {
  const userId = identity.userId?.trim();
  const guestId = identity.guestId?.trim();
  const ownsAsUser = Boolean(userId && order.userId === userId);
  const ownsAsGuest = Boolean(guestId && order.guestId === guestId);
  if (!ownsAsUser && !ownsAsGuest) {
    throw new Error("Order not found.");
  }
  if (!canCustomerCancelOrder(order)) {
    throw new Error(
      "This order cannot be cancelled. Only paid orders that have not shipped may be cancelled from your account.",
    );
  }
}

