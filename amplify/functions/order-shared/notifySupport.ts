import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export type OrderEmailPayload = {
  id: string;
  status?: string | null;
  paymentProvider?: string | null;
  email?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  totalCents: number;
  subtotalCents?: number | null;
  shippingCents?: number | null;
  shippingLabel?: string | null;
  lineItems?: unknown;
  createdAt?: string | null;
};

type LineItem = {
  title?: string;
  variantLabel?: string;
  quantity?: number;
  priceCents?: number;
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parseLineItems(raw: unknown): LineItem[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as LineItem[]) : [];
  } catch {
    return [];
  }
}

function formatOrderLineItemText(item: LineItem): string {
  const qty = item.quantity ?? 1;
  const unit = item.priceCents ?? 0;
  const title = item.title?.trim() || "Item";
  const variant = item.variantLabel?.trim();
  const label = variant ? `${title} — ${variant}` : title;
  return `• ${label} × ${qty} — ${formatMoney(unit * qty)}`;
}

function formatLineItems(lines: LineItem[]): string {
  if (!lines.length) return "No line items recorded.";
  return lines.map(formatOrderLineItemText).join("\n");
}

export function buildOrderNotificationBody(
  order: OrderEmailPayload,
  adminOrderUrl: string,
): { subject: string; text: string; html: string } {
  const lines = parseLineItems(order.lineItems);
  const placedAt = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const text = [
    "A new order was placed on Emperium Forgeworks.",
    "",
    `Order ID: ${order.id}`,
    `Placed: ${placedAt}`,
    `Payment: ${order.paymentProvider ?? "—"}`,
    `Customer: ${order.customerName?.trim() || "—"}`,
    `Email: ${order.email?.trim() || "—"}`,
    `Phone: ${order.customerPhone?.trim() || "—"}`,
    `Subtotal: ${order.subtotalCents != null ? formatMoney(order.subtotalCents) : "—"}`,
    `Shipping: ${
      order.shippingCents != null
        ? `${formatMoney(order.shippingCents)}${order.shippingLabel ? ` (${order.shippingLabel})` : ""}`
        : "—"
    }`,
    `Total: ${formatMoney(order.totalCents)}`,
    "",
    "Items:",
    formatLineItems(lines),
    "",
    `View in admin: ${adminOrderUrl}`,
  ].join("\n");

  const html = text.replace(/\n/g, "<br>");

  return {
    subject: `New order — ${formatMoney(order.totalCents)} (${order.customerName?.trim() || order.email?.trim() || "customer"})`,
    text,
    html,
  };
}

export async function sendSupportOrderEmail(
  order: OrderEmailPayload,
): Promise<boolean> {
  const to = process.env.SUPPORT_INBOX_EMAIL?.trim();
  const from = process.env.ORDER_NOTIFICATION_FROM_EMAIL?.trim();
  const siteUrl = (process.env.SITE_URL ?? "https://emperiumforgeworks.com").replace(
    /\/$/,
    "",
  );

  if (!to || !from) {
    console.warn(
      "Order notification email skipped — set SUPPORT_INBOX_EMAIL and ORDER_NOTIFICATION_FROM_EMAIL.",
    );
    return false;
  }

  const adminOrderUrl = `${siteUrl}/admin/orders/${order.id}`;
  const { subject, text, html } = buildOrderNotificationBody(
    order,
    adminOrderUrl,
  );

  const client = new SESClient({});
  await client.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: text, Charset: "UTF-8" },
          Html: { Data: html, Charset: "UTF-8" },
        },
      },
    }),
  );

  return true;
}
