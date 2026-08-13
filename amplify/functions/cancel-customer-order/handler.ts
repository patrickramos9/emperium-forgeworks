import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";
import { verifyGuestToken } from "../guest-shared/cookie.js";
import { assertCustomerCanCancelOrder } from "../order-shared/refunds.js";
import { issueOrderRefund } from "../order-shared/issueOrderRefund.js";
import { getOrderById } from "../order-shared/stripeOrderStatus.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

type OrderRecord = Schema["Order"]["type"];

type AppSyncEvent = {
  fieldName?: string;
  info?: { fieldName?: string };
  arguments: {
    orderId?: string;
    guestId?: string | null;
    guestToken?: string | null;
  };
  identity?: { sub?: string } | null;
};

function resolveFieldName(event: AppSyncEvent): string {
  return event.info?.fieldName ?? event.fieldName ?? "";
}

function mapGuestOrder(row: OrderRecord) {
  return {
    id: row.id,
    guestId: row.guestId ?? undefined,
    externalSessionId: row.externalSessionId,
    paymentProvider: row.paymentProvider ?? undefined,
    status: row.status ?? "pending",
    email: row.email ?? undefined,
    customerName: row.customerName ?? undefined,
    shippingAddress: row.shippingAddress ?? undefined,
    subtotalCents: row.subtotalCents ?? undefined,
    shippingCents: row.shippingCents ?? undefined,
    shippingLabel: row.shippingLabel ?? undefined,
    taxCents: row.taxCents ?? undefined,
    lineItems: row.lineItems ?? undefined,
    totalCents: row.totalCents,
    discountCents: row.discountCents ?? undefined,
    promoLabel: row.promoLabel ?? undefined,
    fulfillmentStatus: row.fulfillmentStatus ?? undefined,
    fulfillmentUpdatedAt: row.fulfillmentUpdatedAt ?? undefined,
    carrier: row.carrier ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    trackingUrl: row.trackingUrl ?? undefined,
    shippedAt: row.shippedAt ?? undefined,
    deliveredAt: row.deliveredAt ?? undefined,
    refundedCents: row.refundedCents ?? undefined,
    refundNotes: row.refundNotes ?? undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  };
}

function isOrphanedPendingCheckout(order: OrderRecord): boolean {
  return (
    order.status === "pending" &&
    typeof order.externalSessionId === "string" &&
    order.externalSessionId.startsWith("pending_")
  );
}

async function requireGuestId(event: AppSyncEvent): Promise<string> {
  const guestId = event.arguments.guestId?.trim() ?? "";
  const guestToken = event.arguments.guestToken?.trim() ?? "";
  if (!(await verifyGuestToken(guestId, guestToken))) {
    throw new Error("Invalid or missing guest session.");
  }
  return guestId;
}

async function handleGetGuestOrders(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const orderId = event.arguments.orderId?.trim();

  if (orderId) {
    const order = await getOrderById(dataClient, orderId);
    if (!order || order.guestId !== guestId || isOrphanedPendingCheckout(order)) {
      return { orders: [] };
    }
    return { orders: [mapGuestOrder(order)] };
  }

  const rows: OrderRecord[] = [];
  let nextToken: string | undefined;
  do {
    const response = await dataClient.models.Order.list({
      filter: { guestId: { eq: guestId } },
      limit: 50,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row && !isOrphanedPendingCheckout(row)) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  rows.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });

  return { orders: rows.map(mapGuestOrder) };
}

async function handleCancel(event: AppSyncEvent) {
  const userId =
    event.identity && "sub" in event.identity
      ? (event.identity.sub as string | undefined)
      : undefined;

  let guestId: string | undefined;
  if (!userId) {
    guestId = await requireGuestId(event);
  }

  const orderId = event.arguments.orderId;
  if (!orderId) {
    throw new Error("Order id is required.");
  }

  const order = await getOrderById(dataClient, orderId);
  if (!order) {
    throw new Error("Order not found.");
  }

  assertCustomerCanCancelOrder(order, { userId, guestId });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const stripe =
    order.paymentProvider === "stripe" && secretKey
      ? new Stripe(secretKey)
      : undefined;

  if (order.paymentProvider === "stripe" && !stripe) {
    throw new Error("Stripe is not configured.");
  }

  const result = await issueOrderRefund(dataClient, order, {
    reason: "requested_by_customer",
    refundNotes: "Customer cancelled before shipment.",
    source: "customer_cancel",
    stripe,
  });

  return {
    success: true,
    refundId: result.refundId,
    refundedCents: result.refundedCents,
    orderStatus: result.orderStatus,
  };
}

export const handler = async (event: AppSyncEvent) => {
  const fieldName = resolveFieldName(event);
  if (fieldName === "getGuestOrders") {
    return handleGetGuestOrders(event);
  }
  return handleCancel(event);
};
