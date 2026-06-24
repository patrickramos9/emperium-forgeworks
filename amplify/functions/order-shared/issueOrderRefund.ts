import type Stripe from "stripe";
import type { generateClient } from "aws-amplify/data";
import type { Schema } from "../../data/resource";
import {
  applyRefundToOrder,
  refundableCentsRemaining,
  type RefundLedgerEntry,
} from "./refunds.js";

type DataClient = ReturnType<typeof generateClient<Schema>>;
type OrderRecord = Schema["Order"]["type"];

type RefundReason = "requested_by_customer" | "duplicate" | "fraudulent";

export async function issueOrderRefund(
  client: DataClient,
  order: OrderRecord,
  input: {
    amountCents?: number;
    reason?: RefundReason;
    refundNotes?: string;
    source: RefundLedgerEntry["source"];
    stripe?: Stripe;
  },
): Promise<{
  refundId: string;
  refundedCents: number;
  orderStatus: string;
}> {
  const remaining = refundableCentsRemaining(order);
  if (remaining <= 0) {
    throw new Error("This order has no refundable balance remaining.");
  }

  const amountCents =
    input.amountCents == null || input.amountCents <= 0
      ? remaining
      : input.amountCents;

  if (amountCents > remaining) {
    throw new Error(`Refund amount cannot exceed ${remaining} cents remaining.`);
  }

  if (order.paymentProvider === "mock") {
    const refundId = `mock_${Date.now()}`;
    const nextRefunded = (order.refundedCents ?? 0) + amountCents;
    const updated = await applyRefundToOrder(client, order.id, {
      refundedCents: nextRefunded,
      refundNotes: input.refundNotes,
      entry: {
        refundId,
        amountCents,
        reason: input.reason ?? "requested_by_customer",
        createdAt: new Date().toISOString(),
        source: input.source,
      },
    });
    return {
      refundId,
      refundedCents: updated?.refundedCents ?? nextRefunded,
      orderStatus: updated?.status ?? "refunded",
    };
  }

  if (order.paymentProvider !== "stripe") {
    throw new Error("Refunds are not available for this payment method.");
  }

  const paymentIntentId = order.stripePaymentIntentId?.trim();
  if (!paymentIntentId) {
    throw new Error("Order is missing a Stripe payment reference.");
  }

  if (!input.stripe) {
    throw new Error("Stripe is not configured.");
  }

  const refund = await input.stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
    reason: input.reason ?? "requested_by_customer",
  });

  const nextRefunded = (order.refundedCents ?? 0) + refund.amount;
  const updated = await applyRefundToOrder(client, order.id, {
    refundedCents: nextRefunded,
    refundNotes: input.refundNotes,
    entry: {
      refundId: refund.id,
      amountCents: refund.amount,
      reason: refund.reason,
      createdAt: new Date(refund.created * 1000).toISOString(),
      source: input.source,
    },
  });

  return {
    refundId: refund.id,
    refundedCents: updated?.refundedCents ?? nextRefunded,
    orderStatus: updated?.status ?? order.status ?? "paid",
  };
}
