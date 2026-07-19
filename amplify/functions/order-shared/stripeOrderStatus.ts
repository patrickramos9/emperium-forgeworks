import type Stripe from "stripe";
import type { Schema } from "../../data/resource";
import type { OrderSharedDataClient } from "./dataClient.js";
import { applyRefundToOrder } from "./refunds.js";

type DataClient = OrderSharedDataClient;
type OrderRecord = Schema["Order"]["type"];
type OrderStatus = NonNullable<OrderRecord["status"]>;

export async function getOrderById(
  client: DataClient,
  orderId: string,
): Promise<OrderRecord | null> {
  const { data, errors } = await client.models.Order.get({ id: orderId });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return (data as OrderRecord | null | undefined) ?? null;
}

export async function updateOrderStatus(
  client: DataClient,
  orderId: string,
  status: OrderStatus,
  extra?: { stripePaymentIntentId?: string },
): Promise<OrderRecord | null> {
  const { data, errors } = await client.models.Order.update({
    id: orderId,
    status,
    ...extra,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return (data as OrderRecord | null | undefined) ?? null;
}

/** Pending checkout abandoned — do not overwrite paid/refunded orders. */
export async function markPendingOrderCancelled(
  client: DataClient,
  orderId: string,
): Promise<boolean> {
  const order = await getOrderById(client, orderId);
  if (!order || order.status !== "pending") return false;
  await updateOrderStatus(client, orderId, "cancelled");
  return true;
}

/** Cancel open pending checkouts before starting a new Stripe session for the same user. */
export async function cancelSupersededPendingOrders(
  client: DataClient,
  userId: string,
): Promise<void> {
  const rows: OrderRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Order.list({
      filter: { userId: { eq: userId }, status: { eq: "pending" } },
      limit: 50,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row as OrderRecord);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  for (const order of rows) {
    try {
      await markPendingOrderCancelled(client, order.id);
    } catch (err) {
      console.warn(`Could not cancel superseded pending order ${order.id}`, err);
    }
  }
}

export function paymentIntentIdFromSession(
  session: Stripe.Checkout.Session,
): string | undefined {
  const ref = session.payment_intent;
  if (!ref) return undefined;
  return typeof ref === "string" ? ref : ref.id;
}

export async function resolveOrderIdFromPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<string | undefined> {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  const orderId = pi.metadata?.orderId?.trim();
  return orderId || undefined;
}

export function paymentIntentIdFromCharge(
  charge: Stripe.Charge,
): string | undefined {
  const ref = charge.payment_intent;
  if (!ref) return undefined;
  return typeof ref === "string" ? ref : ref.id;
}

/** Sync cumulative Stripe refunds onto the order (full or partial). */
export async function markOrderRefundedFromCharge(
  client: DataClient,
  orderId: string,
  charge: Stripe.Charge,
): Promise<boolean> {
  const order = await getOrderById(client, orderId);
  if (!order || (order.status !== "paid" && order.status !== "refunded")) {
    return false;
  }

  const refundedCents = charge.amount_refunded ?? 0;
  if (refundedCents <= 0) return false;

  await applyRefundToOrder(client, orderId, {
    refundedCents,
    entry: {
      refundId: `charge_${charge.id}_${refundedCents}`,
      amountCents: refundedCents,
      createdAt: new Date((charge.created ?? Date.now() / 1000) * 1000).toISOString(),
      source: "webhook",
    },
  });

  return true;
}
