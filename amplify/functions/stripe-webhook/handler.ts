import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

function response(statusCode: number, body: string) {
  return { statusCode, body };
}

export const handler = async (event: {
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error("Stripe webhook secrets are not configured");
    return response(500, "Stripe not configured");
  }

  const signature =
    event.headers?.["stripe-signature"] ?? event.headers?.["Stripe-Signature"];
  if (!signature || !event.body) {
    return response(400, "Missing Stripe signature or body");
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  const stripe = new Stripe(secretKey);
  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return response(400, "Invalid signature");
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.error("checkout.session.completed missing metadata.orderId");
      return response(400, "Missing orderId metadata");
    }

    const updateResult = await dataClient.models.Order.update({
      id: orderId,
      status: "paid",
      paymentProvider: "stripe",
      externalSessionId: session.id,
    });

    if (updateResult.errors?.length) {
      console.error("Order update failed", updateResult.errors);
      return response(500, "Order update failed");
    }
  }

  if (stripeEvent.type === "checkout.session.expired") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await dataClient.models.Order.update({
        id: orderId,
        status: "failed",
      });
    }
  }

  return response(200, JSON.stringify({ received: true }));
};
