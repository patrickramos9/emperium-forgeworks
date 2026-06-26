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
import { distributeDiscountToLines } from "./promoCalc.js";
import { resolvePromoForCheckout } from "./resolvePromo.js";
import {
  cancelSupersededPendingOrders,
  markPendingOrderCancelled,
  paymentIntentIdFromSession,
} from "../order-shared/stripeOrderStatus.js";
import { resolveVariantLabelFromProductJson } from "../order-shared/resolveVariantLabel.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

/** Stripe Tax — general tangible goods (3D-printed physical products). */
const STRIPE_TANGIBLE_GOODS_TAX_CODE = "txcd_20030000";

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

/** Resolve cart lines to catalog rows (by id, then slug when cart ids are stale). */
async function loadProductsForLineItems(
  items: CheckoutLineItem[],
): Promise<Map<string, ProductRecord>> {
  const map = await loadProductsById(items.map((item) => item.productId));

  await Promise.all(
    items.map(async (item) => {
      if (map.has(item.productId)) return;
      const slug = item.slug?.trim();
      if (!slug) return;

      const response = await dataClient.models.Product.list({
        filter: { slug: { eq: slug } },
        limit: 1,
      });
      if (response.errors?.length) {
        throw new Error(response.errors.map((e) => e.message).join("; "));
      }
      const product = response.data?.[0];
      if (product) map.set(item.productId, product);
    }),
  );

  return map;
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function lineItemDescription(
  item: CheckoutLineItem,
  originalUnitCents: number | undefined,
  promoLabel: string | undefined,
): string | undefined {
  const parts: string[] = [];
  if (
    originalUnitCents != null &&
    originalUnitCents > item.priceCents
  ) {
    parts.push(`Was ${formatUsd(originalUnitCents)} each`);
  }
  if (promoLabel) parts.push(promoLabel);
  return parts.length ? parts.join(" · ") : undefined;
}

function checkoutDisplayTitle(item: CheckoutLineItem): string {
  const variant = item.variantLabel?.trim();
  return variant ? `${item.title} (${variant})` : item.title;
}

async function createStripeCheckoutSession(
  stripe: Stripe,
  items: CheckoutLineItem[],
  originalItems: CheckoutLineItem[],
  subtotalCents: number,
  shipping: ReturnType<typeof resolveCartShipping>,
  options: {
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    promoLabel?: string;
    discountCents?: number;
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
    profile.maxDeliveryDays >= profile.minDeliveryDays
  ) {
    for (const option of shippingOptions) {
      if (option.shipping_rate_data) {
        option.shipping_rate_data.delivery_estimate = {
          minimum: { unit: "business_day", value: profile.minDeliveryDays },
          maximum: { unit: "business_day", value: profile.maxDeliveryDays },
        };
      }
    }
  }

  const discountCents = options.discountCents ?? 0;
  const promoSummary =
    discountCents > 0 && options.promoLabel
      ? `${options.promoLabel}: ${formatUsd(subtotalCents)} → ${formatUsd(
          Math.max(0, subtotalCents - discountCents),
        )} before shipping.`
      : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((item, index) => {
      const original = originalItems[index];
      const description = lineItemDescription(
        item,
        original?.priceCents,
        options.promoLabel,
      );
      return {
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.priceCents,
          product_data: {
            name: checkoutDisplayTitle(item),
            tax_code: STRIPE_TANGIBLE_GOODS_TAX_CODE,
            ...(description ? { description } : {}),
            ...(item.imageUrl?.startsWith("http")
              ? { images: [item.imageUrl] }
              : {}),
          },
        },
      };
    }),
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: options.metadata,
    ...(options.metadata?.orderId
      ? {
          payment_intent_data: {
            metadata: { orderId: options.metadata.orderId },
          },
        }
      : {}),
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries:
        shipping.allowedCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
    },
    shipping_options: shippingOptions,
    phone_number_collection: { enabled: true },
    ...(promoSummary
      ? {
          custom_text: {
            submit: { message: promoSummary },
          },
        }
      : {}),
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return {
    sessionId: session.id,
    redirectUrl: session.url,
    paymentProvider: "stripe" as const,
    session,
  };
}

async function attachOrderIdToStripeSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  orderId: string,
  userId?: string,
) {
  await stripe.checkout.sessions.update(session.id, {
    metadata: {
      orderId,
      ...(userId ? { userId } : {}),
    },
  });

  const paymentIntentId = paymentIntentIdFromSession(session);
  if (paymentIntentId) {
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { orderId },
    });
  }
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
    const cancelUrl =
      event.arguments.cancelUrl ??
      `${siteUrl}/checkout/cancel?session={CHECKOUT_SESSION_ID}`;

    const userId =
      event.identity && "sub" in event.identity
        ? (event.identity.sub as string | undefined)
        : undefined;

    const productById = await loadProductsForLineItems(lineItems);

    function snapshotForLineItem(item: CheckoutLineItem) {
      const product = productById.get(item.productId);
      const variantLabel =
        item.variantLabel?.trim() ||
        resolveVariantLabelFromProductJson(product?.variants, item.variantId);
      return {
        productId: item.productId,
        slug: product?.slug?.trim() || item.slug,
        variantId: item.variantId,
        ...(variantLabel ? { variantLabel } : {}),
        ...(product?.vaultOnly ? { vaultOnly: true } : {}),
        title: product?.title?.trim() || item.title,
        quantity: item.quantity,
        priceCents: item.priceCents,
      };
    }

    const promoCatalog = [
      ...new Map(
        [...productById.values()].map((product) => [
          product.id,
          { id: product.id, slug: product.slug },
        ]),
      ).values(),
    ];

    let promo: Awaited<ReturnType<typeof resolvePromoForCheckout>> = null;
    if (userId) {
      promo = await resolvePromoForCheckout(
        dataClient,
        userId,
        lineItems.map((item) => ({
          productId: item.productId,
          slug: item.slug,
          priceCents: item.priceCents,
          quantity: item.quantity,
        })),
        event.arguments.promoGrantId,
        promoCatalog,
      );
    } else if (event.arguments.promoGrantId) {
      throw new Error("Sign in to use promotional offers.");
    }

    const discountCents = promo?.discountCents ?? 0;
    const checkoutLines =
      discountCents > 0
        ? distributeDiscountToLines(lineItems, discountCents)
        : lineItems;

    const allProfiles = await loadShippingProfiles();
    const activeProfiles = allProfiles.filter((p) => p.active);
    if (!activeProfiles.length) {
      throw new Error(
        "No active shipping profiles. Create one in Admin → Shipping.",
      );
    }

    const profileById = new Map(activeProfiles.map((p) => [p.id, p]));
    const sortedActiveProfiles = [...activeProfiles].sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
    );
    const defaultProfile = sortedActiveProfiles[0] ?? null;

    for (const item of lineItems) {
      const product = productById.get(item.productId);
      if (!product) {
        throw new Error(
          `"${item.title}" is no longer available. Update your cart and try again.`,
        );
      }
      if (product.inStock === false) {
        throw new Error(
          `"${item.title}" is out of stock. Update your cart and try again.`,
        );
      }
    }

    const shipping = resolveCartShipping(
      checkoutLines,
      productById,
      profileById,
      defaultProfile,
    );

    if (userId) {
      await cancelSupersededPendingOrders(dataClient, userId);
    }

    const snapshots = lineItems.map((item) => snapshotForLineItem(item));
    const stripe = new Stripe(secretKey);
    let checkoutSession: Stripe.Checkout.Session | null = null;
    let orderId: string | null = null;

    try {
      const sessionResult = await createStripeCheckoutSession(
        stripe,
        checkoutLines,
        lineItems,
        subtotalCents,
        shipping,
        {
          successUrl,
          cancelUrl,
          ...(userId ? { metadata: { userId } } : {}),
          ...(discountCents > 0 && promo
            ? {
                promoLabel: promo.label,
                discountCents,
              }
            : {}),
        },
      );
      checkoutSession = sessionResult.session;

      const createResult = await dataClient.models.Order.create({
        externalSessionId: sessionResult.sessionId,
        paymentProvider: "stripe",
        status: "pending",
        lineItems: JSON.stringify(snapshots),
        subtotalCents,
        totalCents: Math.max(0, subtotalCents - discountCents),
        ...(discountCents > 0
          ? {
              discountCents,
              promoGrantId: promo!.grantId,
              promoSource: promo!.source,
              promoLabel: promo!.label,
              ...(promo!.expiresAt ? { promoExpiresAt: promo!.expiresAt } : {}),
            }
          : {}),
        ...(userId ? { userId } : {}),
      });

      if (createResult.errors?.length) {
        throw new Error(createResult.errors.map((e) => e.message).join("; "));
      }
      if (!createResult.data?.id) {
        throw new Error("Could not create pending order.");
      }

      orderId = createResult.data.id;
      await attachOrderIdToStripeSession(
        stripe,
        checkoutSession,
        orderId,
        userId,
      );

      return {
        sessionId: sessionResult.sessionId,
        redirectUrl: sessionResult.redirectUrl,
        paymentProvider: "stripe",
      };
    } catch (err) {
      if (orderId) {
        try {
          await markPendingOrderCancelled(dataClient, orderId);
        } catch (cancelErr) {
          console.error("Could not cancel failed checkout order", cancelErr);
        }
      }
      if (checkoutSession?.id) {
        try {
          await stripe.checkout.sessions.expire(checkoutSession.id);
        } catch (expireErr) {
          console.warn("Could not expire failed checkout session", expireErr);
        }
      }
      throw err;
    }
  };
