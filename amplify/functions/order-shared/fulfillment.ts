import type { Schema } from "../../data/resource";
import { sendCustomerFulfillmentEmail } from "./notifyCustomer.js";
import { purgePrintJobFilesForOrder } from "./purgePrintJobs.js";
import { assertPrintReviewAllowsFulfillment } from "./printLineReview.js";

export type FulfillmentStatus = "paid" | "received" | "processing" | "shipped";

const FULFILLMENT_STAGES: FulfillmentStatus[] = [
  "paid",
  "received",
  "processing",
  "shipped",
];

type OrderRow = Schema["Order"]["type"];

type FulfillmentDataClient = {
  models: {
    Order: {
      update: (input: {
        id: string;
        fulfillmentStatus?: FulfillmentStatus;
        fulfillmentUpdatedAt?: string | null;
        carrier?: string | null;
        trackingNumber?: string | null;
        trackingUrl?: string | null;
        shippedAt?: string | null;
        lineItems?: string | null;
      }) => Promise<{
        data?: OrderRow | null;
        errors?: { message: string }[] | null;
      }>;
    };
    Notification: {
      create: (input: {
        title: string;
        body: string;
        kind: "order";
        userId: string;
        active: boolean;
        sortOrder: number;
      }) => Promise<{ errors?: { message: string }[] | null }>;
    };
  };
};

export function effectiveFulfillmentStatus(order: {
  fulfillmentStatus?: string | null;
}): FulfillmentStatus | null {
  if (
    order.fulfillmentStatus &&
    FULFILLMENT_STAGES.includes(order.fulfillmentStatus as FulfillmentStatus)
  ) {
    return order.fulfillmentStatus as FulfillmentStatus;
  }
  return null;
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

function buildTrackingUrl(
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

function notificationCopy(
  status: FulfillmentStatus,
  order: OrderRow,
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

export async function createFulfillmentNotification(
  client: FulfillmentDataClient,
  order: OrderRow,
  status: FulfillmentStatus,
): Promise<boolean> {
  const userId = order.userId?.trim();
  if (!userId) return false;

  const siteUrl = (process.env.SITE_URL ?? "https://emperiumforgeworks.com").replace(
    /\/$/,
    "",
  );
  const orderDetailUrl = `${siteUrl}/account/orders/${order.id}`;
  const copy = notificationCopy(status, order, orderDetailUrl);

  const result = await client.models.Notification.create({
    title: copy.title,
    body: copy.body,
    kind: "order",
    userId,
    active: true,
    sortOrder: 80,
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }

  return true;
}

export type ApplyFulfillmentInput = {
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

export async function applyFulfillmentStatus(
  client: FulfillmentDataClient,
  order: OrderRow,
  targetStatus: FulfillmentStatus,
  input: ApplyFulfillmentInput = {},
): Promise<{
  order: OrderRow;
  notificationSent: boolean;
  emailSent: boolean;
}> {
  const current = effectiveFulfillmentStatus(order);
  if (!canAdvanceFulfillment(current, targetStatus, order.status)) {
    throw new Error(
      `Cannot advance fulfillment from ${current ?? "none"} to ${targetStatus}.`,
    );
  }

  assertPrintReviewAllowsFulfillment(order, targetStatus);

  if (targetStatus === "shipped") {
    const carrier = input.carrier?.trim();
    const trackingNumber = input.trackingNumber?.trim();
    if (!carrier || !trackingNumber) {
      throw new Error("Carrier and tracking number are required to mark shipped.");
    }
  }

  const now = new Date().toISOString();
  const updateResult = await client.models.Order.update({
    id: order.id,
    fulfillmentStatus: targetStatus,
    fulfillmentUpdatedAt: now,
    ...(targetStatus === "shipped"
      ? {
          carrier: input.carrier?.trim(),
          trackingNumber: input.trackingNumber?.trim(),
          trackingUrl: input.trackingUrl?.trim() || null,
          shippedAt: now,
        }
      : {}),
  });
  if (updateResult.errors?.length) {
    throw new Error(updateResult.errors.map((e) => e.message).join("; "));
  }
  const updated = updateResult.data;
  if (!updated) {
    throw new Error("Order fulfillment update failed.");
  }

  let orderForNotify = updated;
  if (targetStatus === "shipped") {
    try {
      const purge = await purgePrintJobFilesForOrder(updated);
      if (purge.updatedLineItemsJson) {
        const purgeUpdate = await client.models.Order.update({
          id: updated.id,
          lineItems: purge.updatedLineItemsJson,
        });
        if (purgeUpdate.errors?.length) {
          console.error(
            "Print job purge lineItems update failed",
            purgeUpdate.errors,
          );
        } else if (purgeUpdate.data) {
          orderForNotify = purgeUpdate.data;
        }
      }
      if (purge.purgedPaths.length) {
        console.log(
          `Purged ${purge.purgedPaths.length} print job file(s) for order ${updated.id}`,
        );
      }
    } catch (err) {
      console.error("Print job purge failed", err);
    }
  }

  let notificationSent = false;
  try {
    notificationSent = await createFulfillmentNotification(
      client,
      orderForNotify,
      targetStatus,
    );
  } catch (err) {
    console.error("Fulfillment notification failed", err);
  }

  let emailSent = false;
  if (targetStatus === "paid" || targetStatus === "shipped") {
    try {
      emailSent = await sendCustomerFulfillmentEmail(orderForNotify, targetStatus);
    } catch (err) {
      console.error("Customer fulfillment email failed", err);
    }
  }

  return { order: orderForNotify, notificationSent, emailSent };
}
