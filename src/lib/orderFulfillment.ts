import type { Schema } from "../../amplify/data/resource";

export type FulfillmentStatus = NonNullable<
  Schema["Order"]["type"]["fulfillmentStatus"]
>;

export const FULFILLMENT_STAGES: FulfillmentStatus[] = [
  "paid",
  "received",
  "processing",
  "shipped",
];

export const CARRIER_OPTIONS = ["USPS", "UPS", "FedEx", "Other"] as const;
export type CarrierOption = (typeof CARRIER_OPTIONS)[number];

export function effectiveFulfillmentStatus(order: {
  fulfillmentStatus?: FulfillmentStatus | null;
}): FulfillmentStatus | null {
  return order.fulfillmentStatus ?? null;
}

/** UI label when legacy paid orders have no fulfillmentStatus yet. */
export function displayFulfillmentStatus(order: {
  fulfillmentStatus?: FulfillmentStatus | null;
  status?: string | null;
}): FulfillmentStatus | null {
  if (order.fulfillmentStatus) return order.fulfillmentStatus;
  if (order.status === "paid") return "paid";
  return null;
}

export function fulfillmentStatusLabel(
  status: FulfillmentStatus | null | undefined,
): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "received":
      return "Received";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    default:
      return "—";
  }
}

export function nextFulfillmentStatus(
  current: FulfillmentStatus | null,
): FulfillmentStatus | null {
  if (!current) return "paid";
  const index = FULFILLMENT_STAGES.indexOf(current);
  if (index < 0 || index >= FULFILLMENT_STAGES.length - 1) return null;
  return FULFILLMENT_STAGES[index + 1] ?? null;
}

export function canAdvanceFulfillment(
  current: FulfillmentStatus | null,
  target: FulfillmentStatus,
  paymentStatus: string | null | undefined,
): boolean {
  if (paymentStatus !== "paid") return false;
  if (target === "paid" && !current) return true;

  const from =
    current ?? (paymentStatus === "paid" ? ("paid" as FulfillmentStatus) : null);
  if (!from) return false;

  const currentIndex = FULFILLMENT_STAGES.indexOf(from);
  const targetIndex = FULFILLMENT_STAGES.indexOf(target);
  return targetIndex === currentIndex + 1;
}

export function buildTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined,
  trackingUrl?: string | null,
): string | null {
  const custom = trackingUrl?.trim();
  if (custom) return custom;

  const number = trackingNumber?.trim();
  if (!number) return null;

  const carrierKey = carrier?.trim().toUpperCase() ?? "";
  if (carrierKey.includes("USPS")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(number)}`;
  }
  if (carrierKey.includes("UPS")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(number)}`;
  }
  if (carrierKey.includes("FEDEX")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(number)}`;
  }
  return null;
}

export function fulfillmentNotificationCopy(
  status: FulfillmentStatus,
  order: {
    id: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  },
  orderDetailUrl: string,
): { title: string; body: string } {
  switch (status) {
    case "paid":
      return {
        title: "Payment received",
        body: `Your payment was received — we're preparing your order. View details: ${orderDetailUrl}`,
      };
    case "received":
      return {
        title: "Order received",
        body: `We've received your order and it's in our queue. View details: ${orderDetailUrl}`,
      };
    case "processing":
      return {
        title: "Order in progress",
        body: `Your order is being forged. View details: ${orderDetailUrl}`,
      };
    case "shipped": {
      const carrier = order.carrier?.trim() || "carrier";
      const tracking = order.trackingNumber?.trim() || "";
      const trackUrl = buildTrackingUrl(
        order.carrier,
        order.trackingNumber,
        order.trackingUrl,
      );
      const trackingPart = trackUrl
        ? ` Track it here: ${trackUrl}`
        : tracking
          ? ` Tracking: ${tracking}`
          : "";
      return {
        title: "Order shipped",
        body: `Your order has shipped via ${carrier}.${trackingPart} View details: ${orderDetailUrl}`,
      };
    }
    default:
      return {
        title: "Order update",
        body: `Your order was updated. View details: ${orderDetailUrl}`,
      };
  }
}
