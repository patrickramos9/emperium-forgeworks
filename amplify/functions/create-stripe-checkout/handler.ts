import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";
import {
  buildStripeShippingOptions,
  lineItemsFromArgs,
  resolveCartShipping,
  type CheckoutLineItem,
} from "./shippingCalc.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

type ShippingProfileRecord = Schema["ShippingProfile"]["type"];
type ProductRecord = Schema["Product"]["type"];

async function loadShippingProfiles(): Promise<ShippingProfileRecord[]> {
  const rows: ShippingProfileRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await dataClient.models.ShippingProfile.list({
      limit: 50,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows;
}

async function loadProductsById(
  productIds: string[],
): Promise<Map<string, ProductRecord>> {
  const map = new Map<string, ProductRecord>();
  const unique = [...new Set(productIds)];

  await Promise.all(
    unique.map(async (id) => {
      const { data, errors } = await dataClient.models.Product.get({ id });
      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join("; "));
      }
      if (data) map.set(id, data);
    }),
  );

  return map;
}

async function createStripeCheckoutSession(
  stripe: Stripe,
  items: CheckoutLineItem[],
  subtotalCents: number,
  shipping: ReturnType<typeof resolveCartShipping>,
  options: {
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  },
) {
  const shippingOptions = buildStripeShippingOptions(shipping);
  const primaryProfile = shipping.profileIds.length
    ? await dataClient.models.ShippingProfile.get({
        id: shipping.profileIds[0]!,
      })
    : null;
  const profile = primaryProfile?.data;

  if (
    profile?.minDeliveryDays != null &&
    profile.maxDeliveryDays != null &&
    profile.minDeliveryDays > 0 &&
    profile.maxDeliveryDays >= profile.minDeliveryDays &&
    shippingOptions[0]?.shipping_rate_data
  ) {
    shippingOptions[0].shipping_rate_data.delivery_estimate = {
      minimum: { unit: "business_day", value: profile.minDeliveryDays },
      maximum: { unit: "business_day", value: profile.maxDeliveryDays },
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: item.priceCents,
        product_data: {
          name: item.title,
          ...(item.imageUrl?.startsWith("http")
            ? { images: [item.imageUrl] }
            : {}),
        },
      },
    })),
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: options.metadata,
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries:
        shipping.allowedCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
    },
    shipping_options: shippingOptions,
    phone_number_collection: { enabled: true },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return {
    sessionId: session.id,
    redirectUrl: session.url,
    paymentProvider: "stripe" as const,
  };
}

export const handler: Schema["createStripeCheckoutSession"]["functionHandler"] =
  async (event) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const lineItems = lineItemsFromArgs(event.arguments.lineItems);
    if (!lineItems.length) {
      throw new Error("Cart is empty");
    }

    const subtotalCents = lineItems.reduce(
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
      subtotalCents,
      totalCents: subtotalCents,
      ...(userId ? { userId } : {}),
    });

    if (createResult.errors?.length) {
      throw new Error(createResult.errors.map((e) => e.message).join("; "));
    }
    if (!createResult.data?.id) {
      throw new Error("Could not create pending order.");
    }

    const orderId = createResult.data.id;
    const allProfiles = await loadShippingProfiles();
    const activeProfiles = allProfiles.filter((p) => p.active);
    if (!activeProfiles.length) {
      throw new Error(
        "No active shipping profiles. Create one in Admin → Shipping.",
      );
    }

    const profileById = new Map(activeProfiles.map((p) => [p.id, p]));
    const defaultProfile = activeProfiles.find((p) => p.isDefault) ?? null;

    const productById = await loadProductsById(
      lineItems.map((item) => item.productId),
    );

    const shipping = resolveCartShipping(
      lineItems,
      productById,
      profileById,
      defaultProfile,
    );

    const stripe = new Stripe(secretKey);
    const session = await createStripeCheckoutSession(
      stripe,
      lineItems,
      subtotalCents,
      shipping,
      {
        successUrl,
        cancelUrl,
        metadata: { orderId },
      },
    );

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
