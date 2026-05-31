import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import {
  StripePaymentProvider,
  loadConfig,
  type CheckoutLineItem,
} from "@emperium/shared";
import type { Schema } from "../../data/resource";
import { env } from "$amplify/env/create-stripe-checkout";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

function lineItemsFromArgs(
  items: Schema["CheckoutCartLine"]["type"][],
): CheckoutLineItem[] {
  return items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    variantId: item.variantId ?? undefined,
    quantity: item.quantity,
    title: item.title,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl ?? undefined,
  }));
}

export const handler: Schema["createStripeCheckoutSession"]["functionHandler"] =
  async (event) => {
    const lineItems = lineItemsFromArgs(event.arguments.lineItems);
    if (!lineItems.length) {
      throw new Error("Cart is empty");
    }

    const totalCents = lineItems.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );

    const siteUrl = (process.env.SITE_URL ?? "http://localhost:5173").replace(
      /\/$/,
      "",
    );
    const successUrl =
      event.arguments.successUrl ??
      `${siteUrl}/checkout/success?session={CHECKOUT_SESSION_ID}`;
    const cancelUrl = event.arguments.cancelUrl ?? `${siteUrl}/checkout/cancel`;

    const userId =
      event.identity && "sub" in event.identity
        ? (event.identity.sub as string | undefined)
        : undefined;

    const pendingId = crypto.randomUUID();
    const pendingSessionId = `pending_${pendingId}`;

    const snapshots = lineItems.map((item) => ({
      productId: item.productId,
      slug: item.slug,
      variantId: item.variantId,
      title: item.title,
      quantity: item.quantity,
      priceCents: item.priceCents,
    }));

    const createResult = await dataClient.models.Order.create({
      externalSessionId: pendingSessionId,
      paymentProvider: "stripe",
      status: "pending",
      lineItems: JSON.stringify(snapshots),
      totalCents,
      ...(userId ? { userId } : {}),
    });

    if (createResult.errors?.length) {
      throw new Error(createResult.errors.map((e) => e.message).join("; "));
    }
    if (!createResult.data?.id) {
      throw new Error("Could not create pending order.");
    }

    const orderId = createResult.data.id;

    const provider = new StripePaymentProvider(
      loadConfig({
        appEnv: "deployment",
        siteUrl,
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      }),
    );

    const session = await provider.createCheckoutSession(lineItems, {
      successUrl,
      cancelUrl,
      metadata: { orderId },
    });

    const updateResult = await dataClient.models.Order.update({
      id: orderId,
      externalSessionId: session.sessionId,
    });

    if (updateResult.errors?.length) {
      throw new Error(updateResult.errors.map((e) => e.message).join("; "));
    }

    return {
      sessionId: session.sessionId,
      redirectUrl: session.redirectUrl,
      paymentProvider: "stripe",
    };
  };
