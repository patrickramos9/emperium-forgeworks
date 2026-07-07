import type { Schema } from "../../amplify/data/resource";
import { formatPrice } from "@/data/seedProducts";

export type OrderRecord = Schema["Order"]["type"];

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

export function refundableCentsRemaining(
  order: Pick<OrderRecord, "totalCents" | "refundedCents">,
): number {
  const refunded = order.refundedCents ?? 0;
  return Math.max(0, order.totalCents - refunded);
}

export function isPartiallyRefunded(order: OrderRecord): boolean {
  const refunded = order.refundedCents ?? 0;
  return refunded > 0 && refunded < order.totalCents;
}

export function isCustomerCancelledOrder(order: OrderRecord): boolean {
  return parseRefundLedger(order.refunds).some(
    (entry) => entry.source === "customer_cancel",
  );
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

export function isFullyRefunded(order: OrderRecord): boolean {
  const refunded = order.refundedCents ?? 0;
  return (
    order.status === "refunded" ||
    isCustomerCancelledOrder(order) ||
    refunded >= order.totalCents
  );
}

export function isFullyRefundedOrder(
  order: {
    status?: string | null;
    refundedCents?: number | null;
    totalCents?: number;
    refunds?: unknown;
  },
): boolean {
  const refunded = order.refundedCents ?? 0;
  const total = order.totalCents ?? 0;
  const cancelled =
    typeof order.refunds === "string"
      ? order.refunds.includes("customer_cancel")
      : Array.isArray(order.refunds) &&
        order.refunds.some(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            "source" in entry &&
            (entry as { source?: string }).source === "customer_cancel",
        );
  return (
    order.status === "refunded" ||
    cancelled ||
    (total > 0 && refunded >= total)
  );
}

export function showFulfillmentProgress(order: OrderRecord): boolean {
  return order.status === "paid" && (order.refundedCents ?? 0) === 0;
}

export function paymentStatusDetail(order: OrderRecord): string {
  if (isCustomerCancelledOrder(order)) {
    return "Cancelled";
  }
  const refunded = order.refundedCents ?? 0;
  if (order.status === "refunded" || refunded >= order.totalCents) {
    return "Refunded";
  }
  if (refunded > 0) {
    return `Partially refunded (${formatPrice(refunded)})`;
  }
  return order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "Unknown";
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

export const RETURN_REASON_OPTIONS = [
  { value: "defective", label: "Defective or damaged" },
  { value: "not_as_described", label: "Not as described" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "exchange", label: "Exchange (different item or variant)" },
  { value: "other", label: "Other" },
] as const;

export type ReturnReason = (typeof RETURN_REASON_OPTIONS)[number]["value"];

export const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  approved: "Approved — ship your return",
  denied: "Denied",
  received: "Received at forge",
  closed: "Closed",
};

export const STRIPE_REFUND_REASON_OPTIONS = [
  { value: "requested_by_customer", label: "Requested by customer" },
  { value: "duplicate", label: "Duplicate" },
  { value: "fraudulent", label: "Fraudulent" },
] as const;

export type StripeRefundReason =
  (typeof STRIPE_REFUND_REASON_OPTIONS)[number]["value"];
