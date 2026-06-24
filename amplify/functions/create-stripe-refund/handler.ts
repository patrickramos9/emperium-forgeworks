import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";
import {
  applyRefundToOrder,
  refundableCentsRemaining,
} from "../order-shared/refunds.js";
import { getOrderById } from "../order-shared/stripeOrderStatus.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

const STRIPE_REASONS = new Set([
  "requested_by_customer",
  "duplicate",
  "fraudulent",
]);

export const handler: Schema["createStripeRefund"]["functionHandler"] =
  async (event) => {
    const orderId = event.arguments.orderId;
    const amountArg = event.arguments.amountCents;
    const reason = event.arguments.reason ?? "requested_by_customer";
    const refundNotes = event.arguments.refundNotes?.trim() || undefined;

    if (!STRIPE_REASONS.has(reason)) {
      throw new Error("Invalid refund reason.");
    }

    const order = await getOrderById(dataClient, orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.paymentProvider !== "stripe") {
      throw new Error(
        "Stripe refunds apply only to Stripe-paid orders. Update payment status manually for mock checkout.",
      );
    }
    if (order.status !== "paid" && order.status !== "refunded") {
      throw new Error("Only paid orders can be refunded.");
    }

    const remaining = refundableCentsRemaining(order);
    if (remaining <= 0) {
      throw new Error("This order has no refundable balance remaining.");
    }

    const amountCents =
      amountArg == null || amountArg <= 0 ? remaining : amountArg;
    if (amountCents > remaining) {
      throw new Error(
        `Refund amount cannot exceed ${remaining} cents remaining.`,
      );
    }

    const paymentIntentId = order.stripePaymentIntentId?.trim();
    if (!paymentIntentId) {
      throw new Error("Order is missing a Stripe payment reference.");
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe is not configured.");
    }

    const stripe = new Stripe(secretKey);
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
      reason,
    });

    const nextRefunded = (order.refundedCents ?? 0) + refund.amount;
    const updated = await applyRefundToOrder(dataClient, orderId, {
      refundedCents: nextRefunded,
      refundNotes,
      entry: {
        refundId: refund.id,
        amountCents: refund.amount,
        reason: refund.reason,
        createdAt: new Date(refund.created * 1000).toISOString(),
        source: "admin",
      },
    });

    return {
      success: true,
      refundId: refund.id,
      refundedCents: updated?.refundedCents ?? nextRefunded,
      orderStatus: updated?.status ?? order.status ?? "paid",
    };
  };
