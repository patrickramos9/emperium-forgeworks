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

type ShippingAddressSnapshot = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

function shippingFromSession(
  session: Stripe.Checkout.Session,
): ShippingAddressSnapshot | undefined {
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  if (!address?.line1) return undefined;

  return {
    name: shipping?.name ?? undefined,
    line1: address.line1 ?? undefined,
    line2: address.line2 ?? undefined,
    city: address.city ?? undefined,
    state: address.state ?? undefined,
    postalCode: address.postal_code ?? undefined,
    country: address.country ?? undefined,
  };
}

async function fulfillmentFromSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  const shippingAddress = shippingFromSession(session);
  const customer = session.customer_details;
  const shippingCents =
    session.total_details?.amount_shipping ??
    session.shipping_cost?.amount_total ??
    0;

  let shippingLabel: string | undefined;
  const rateRef = session.shipping_cost?.shipping_rate;
  const rateId = typeof rateRef === "string" ? rateRef : rateRef?.id;
  if (rateId) {
    try {
      const rate = await stripe.shippingRates.retrieve(rateId);
      shippingLabel = rate.display_name ?? undefined;
    } catch (err) {
      console.warn("Could not retrieve shipping rate", err);
    }
  }

  return {
    status: "paid" as const,
    paymentProvider: "stripe" as const,
    externalSessionId: session.id,
    email: customer?.email ?? undefined,
    customerName: customer?.name ?? shippingAddress?.name ?? undefined,
    customerPhone: customer?.phone ?? undefined,
    subtotalCents: session.amount_subtotal ?? undefined,
    shippingCents,
    shippingLabel,
    totalCents: session.amount_total ?? undefined,
    ...(shippingAddress
      ? { shippingAddress: JSON.stringify(shippingAddress) }
      : {}),
  };
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
      ...(await fulfillmentFromSession(session, stripe)),
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
