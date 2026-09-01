import { sendEmail } from "./emailProvider.js";
import { resolveContactEmail } from "./resolveContactEmail.js";
import type { OrderEmailPayload } from "./notifySupport.js";

type FulfillmentStatus = "paid" | "received" | "processing" | "shipped";

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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

function buildCustomerEmail(
  order: OrderEmailPayload & {
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  },
  status: FulfillmentStatus,
  orderDetailUrl: string,
): { subject: string; text: string; html: string } | null {
  const name = order.customerName?.trim() || "there";

  if (status === "paid") {
    const text = [
      `Hi ${name},`,
      "",
      "Thank you for your order with Emperium Forgeworks. Your payment was received.",
      "",
      `Order total: ${formatMoney(order.totalCents)}`,
      "",
      `View your order: ${orderDetailUrl}`,
      "",
      "We'll notify you when your order ships.",
    ].join("\n");

    return {
      subject: "Order confirmed — Emperium Forgeworks",
      text,
      html: text.replace(/\n/g, "<br>"),
    };
  }

  if (status === "shipped") {
    const carrier = order.carrier?.trim() || "your carrier";
    const tracking = order.trackingNumber?.trim() || "";
    const trackUrl = buildTrackingUrl(
      order.carrier,
      order.trackingNumber,
      order.trackingUrl,
    );

    const text = [
      `Hi ${name},`,
      "",
      "Your order has shipped.",
      "",
      `Carrier: ${carrier}`,
      tracking ? `Tracking number: ${tracking}` : "",
      trackUrl ? `Track your package: ${trackUrl}` : "",
      "",
      `View your order: ${orderDetailUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      subject: "Your order has shipped — Emperium Forgeworks",
      text,
      html: text.replace(/\n/g, "<br>"),
    };
  }

  return null;
}

export async function sendCustomerFulfillmentEmail(
  order: OrderEmailPayload & {
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  },
  status: FulfillmentStatus,
): Promise<boolean> {
  const to = await resolveContactEmail({
    email: order.email,
    userId: order.userId,
  });
  if (!to) {
    console.warn(
      `Customer fulfillment email skipped — no email on order ${order.id} (and Cognito lookup failed or no userId).`,
    );
    return false;
  }

  const siteUrl = (process.env.SITE_URL ?? "https://emperiumforgeworks.com").replace(
    /\/$/,
    "",
  );
  const orderDetailUrl = `${siteUrl}/account/orders/${order.id}`;
  const message = buildCustomerEmail(order, status, orderDetailUrl);
  if (!message) return false;

  return sendEmail({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    kind: "order",
    channel: status === "shipped" ? "order_shipped" : "order_paid",
  });
}
