import type { generateClient } from "aws-amplify/data";
import type Stripe from "stripe";
import type { Schema } from "../../data/resource";

type DataClient = ReturnType<typeof generateClient<Schema>>;
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
  return data ?? null;
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
  return data ?? null;
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

/** Full refund in Stripe → order refunded. Partial refunds leave status paid (M16a UI later). */
export async function markOrderRefundedFromCharge(
  client: DataClient,
  orderId: string,
  charge: Stripe.Charge,
): Promise<boolean> {
  const order = await getOrderById(client, orderId);
  if (!order || order.status !== "paid") return false;

  const refundedCents = charge.amount_refunded ?? 0;
  if (refundedCents < order.totalCents) {
    console.info(
      `Partial refund on order ${orderId}: ${refundedCents} of ${order.totalCents} cents`,
    );
    return false;
  }

  await updateOrderStatus(client, orderId, "refunded");
  return true;
}
