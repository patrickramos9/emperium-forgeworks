import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";
import { markPendingOrderCancelled } from "../order-shared/stripeOrderStatus.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: Schema["cancelStripeCheckoutSession"]["functionHandler"] =
  async (event) => {
    const checkoutSessionId = event.arguments.checkoutSessionId?.trim();
    if (!checkoutSessionId) {
      throw new Error("Checkout session id is required.");
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe is not configured.");
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const orderId = session.metadata?.orderId?.trim();

    if (!orderId) {
      return { cancelled: false, status: null };
    }

    if (session.payment_status === "paid") {
      const order = await dataClient.models.Order.get({ id: orderId });
      return {
        cancelled: false,
        status: order.data?.status ?? "paid",
      };
    }

    const cancelled = await markPendingOrderCancelled(dataClient, orderId);
    const order = await dataClient.models.Order.get({ id: orderId });

    return {
      cancelled,
      status: order.data?.status ?? (cancelled ? "cancelled" : null),
    };
  };
