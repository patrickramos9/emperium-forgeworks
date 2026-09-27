import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";
import { sendSupportOrderEmail } from "../order-shared/notifySupport.js";
import { applyFulfillmentStatus } from "../order-shared/fulfillment.js";
import {
  markOrderRefundedFromCharge,
  markPendingOrderCancelled,
  paymentIntentIdFromCharge,
  paymentIntentIdFromSession,
  resolveOrderIdFromPaymentIntent,
} from "../order-shared/stripeOrderStatus.js";
import {
  issueThankYouGrant,
  redeemPromoGrantForOrder,
  reissueFavoriteGrantsAfterOrder,
} from "./promoFulfillment.js";

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

type LegacyCheckoutSession = Stripe.Checkout.Session & {
  /** Pre-basil webhook payloads still send this at the top level. */
  shipping_details?: {
    name?: string | null;
    address?: Stripe.Address | null;
  } | null;
};

function addressSnapshot(
  name: string | null | undefined,
  address: Stripe.Address | null | undefined,
): ShippingAddressSnapshot | undefined {
  if (!address?.line1) return undefined;

  return {
    name: name ?? undefined,
    line1: address.line1 ?? undefined,
    line2: address.line2 ?? undefined,
    city: address.city ?? undefined,
    state: address.state ?? undefined,
    postalCode: address.postal_code ?? undefined,
    country: address.country ?? undefined,
  };
}

function shippingFromSession(
  session: Stripe.Checkout.Session,
): ShippingAddressSnapshot | undefined {
  const legacy = session as LegacyCheckoutSession;
  const shipping =
    session.collected_information?.shipping_details ??
    legacy.shipping_details ??
    null;
  const shipTo = addressSnapshot(shipping?.name, shipping?.address);
  if (shipTo) return shipTo;

  const billing = session.customer_details;
  const billedTo = addressSnapshot(billing?.name, billing?.address);
  if (billedTo) {
    console.warn(
      "Checkout session has no shipping_details; using billing address",
      session.id,
    );
  }
  return billedTo;
}

/**
 * Webhook events use the endpoint's API version, which may still be the
 * pre-basil shape (`shipping_details` at the top, no `collected_information`).
 * Retrieve with the current SDK so email and ship-to are actually present.
 */
async function sessionForFulfillment(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.retrieve(session.id);
  } catch (err) {
    console.error(
      "Checkout session retrieve failed; using webhook payload",
      session.id,
      err,
    );
    return session;
  }
}

async function fulfillmentFromSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  const shippingAddress = shippingFromSession(session);
  const customer = session.customer_details;
  const email =
    customer?.email?.trim() || session.customer_email?.trim() || undefined;
  if (!email) {
    console.error("Paid checkout is missing a customer email", session.id);
  }
  if (!shippingAddress) {
    console.error("Paid checkout is missing a shipping address", session.id);
  }
  const shippingCents =
    session.total_details?.amount_shipping ??
    session.shipping_cost?.amount_total ??
    0;
  const taxCents = session.total_details?.amount_tax ?? 0;

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

  const paymentIntentId = paymentIntentIdFromSession(session);

  return {
    status: "paid" as const,
    paymentProvider: "stripe" as const,
    externalSessionId: session.id,
    ...(email ? { email } : {}),
    customerName: customer?.name ?? shippingAddress?.name ?? undefined,
    customerPhone: customer?.phone ?? undefined,
    subtotalCents: session.amount_subtotal ?? undefined,
    shippingCents,
    shippingLabel,
    taxCents,
    totalCents: session.amount_total ?? undefined,
    ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    ...(shippingAddress
      ? { shippingAddress: JSON.stringify(shippingAddress) }
      : {}),
  };
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.error("checkout.session.completed missing metadata.orderId");
    return response(400, "Missing orderId metadata");
  }

  const fullSession = await sessionForFulfillment(stripe, session);
  const fulfillment = await fulfillmentFromSession(fullSession, stripe);

  const updateResult = await dataClient.models.Order.update({
    id: orderId,
    ...fulfillment,
  });

  if (updateResult.errors?.length) {
    console.error("Order update failed", updateResult.errors);
    return response(500, "Order update failed");
  }

  const order = updateResult.data;
  if (order) {
    if (!order.supportNotifiedAt) {
      try {
        const sent = await sendSupportOrderEmail(
          { ...order, ...fulfillment },
          dataClient,
        );
        if (sent) {
          await dataClient.models.Order.update({
            id: order.id,
            supportNotifiedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Support order email failed", err);
      }
    }

    if (!order.fulfillmentStatus) {
      try {
        await applyFulfillmentStatus(dataClient, order, "paid");
      } catch (err) {
        console.error("Fulfillment paid transition failed", err);
      }
    }

    try {
      await redeemPromoGrantForOrder(dataClient, order);
      if (order.userId) {
        await issueThankYouGrant(dataClient, order.userId);
        await reissueFavoriteGrantsAfterOrder(
          dataClient,
          order.userId,
          order.lineItems,
        );
      }
    } catch (err) {
      console.error("Promo fulfillment failed", err);
    }

    const printRequestId = session.metadata?.printRequestId?.trim();
    if (printRequestId) {
      try {
        await dataClient.models.PrintRequest.update({
          id: printRequestId,
          status: "paid",
          orderId,
        });
      } catch (err) {
        console.error("PrintRequest paid update failed", err);
      }
    }
  }

  return null;
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  try {
    await markPendingOrderCancelled(dataClient, orderId);
  } catch (err) {
    console.error("checkout.session.expired order update failed", err);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge, stripe: Stripe) {
  const paymentIntentId = paymentIntentIdFromCharge(charge);
  if (!paymentIntentId) return;

  try {
    const orderId = await resolveOrderIdFromPaymentIntent(
      stripe,
      paymentIntentId,
    );
    if (!orderId) {
      console.warn("charge.refunded without orderId metadata", paymentIntentId);
      return;
    }
    await markOrderRefundedFromCharge(dataClient, orderId, charge);
  } catch (err) {
    console.error("charge.refunded handler failed", err);
  }
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
    const early = await handleCheckoutCompleted(session, stripe);
    if (early) return early;
  }

  if (stripeEvent.type === "checkout.session.expired") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    await handleCheckoutExpired(session);
  }

  if (stripeEvent.type === "charge.refunded") {
    const charge = stripeEvent.data.object as Stripe.Charge;
    await handleChargeRefunded(charge, stripe);
  }

  return response(200, JSON.stringify({ received: true }));
};
