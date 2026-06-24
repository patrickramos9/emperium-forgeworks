import type { Schema } from "../../amplify/data/resource";
import { formatPrice } from "@/data/seedProducts";

export type OrderRecord = Schema["Order"]["type"];

export type RefundLedgerEntry = {
  refundId: string;
  amountCents: number;
  reason?: string | null;
  createdAt: string;
  source: "admin" | "webhook";
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

export function paymentStatusDetail(order: OrderRecord): string {
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
  return isWithinReturnWindow(order);
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
