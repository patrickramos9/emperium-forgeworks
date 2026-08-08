import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";
import {
  buildStripeShippingOptions,
  resolveCartShipping,
  type CheckoutLineItem,
} from "../create-stripe-checkout/shippingCalc.js";
import {
  formatPrintFigureLinesSummary,
  parsePrintFigureLines,
  printServicePayloadFromQuotedRequest,
} from "../order-shared/printRequest.js";
import {
  formatPrintServiceVariantLabel,
  normalizePrintServiceConfigRow,
  PRINT_SERVICE_CATALOG_SLUG,
  PRINT_SERVICE_CONFIG_KEY,
} from "../order-shared/printService.js";
import {
  cancelSupersededPendingOrders,
  markPendingOrderCancelled,
} from "../order-shared/stripeOrderStatus.js";
import { verifyGuestToken } from "../guest-shared/cookie.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

const STRIPE_TANGIBLE_GOODS_TAX_CODE = "txcd_99999999";

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

async function findProductBySlug(slug: string): Promise<ProductRecord | null> {
  const normalized = slug.trim();
  if (!normalized) return null;

  // AppSync slug filters on Product are unreliable — scan pages and match locally
  // (same approach as src/lib/listAllProducts.findProductBySlug).
  let nextToken: string | undefined;
  do {
    const response = await dataClient.models.Product.list({
      limit: 100,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    const match = (response.data ?? []).find(
      (row) => row?.slug === normalized,
    );
    if (match) return match;
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return null;
}

export const handler: Schema["createPrintQuoteCheckoutSession"]["functionHandler"] =
  async (event) => {
    const userId =
      event.identity && "sub" in event.identity
        ? (event.identity.sub as string | undefined)
        : undefined;

    const guestIdArg = event.arguments.guestId?.trim() ?? "";
    const guestTokenArg = event.arguments.guestToken?.trim() ?? "";
    let verifiedGuestId: string | undefined;
    if (!userId) {
      if (!(await verifyGuestToken(guestIdArg, guestTokenArg))) {
        throw new Error("Invalid or missing guest session.");
      }
      verifiedGuestId = guestIdArg;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe is not configured.");
    }

    const printRequestId = event.arguments.printRequestId;
    const siteUrl = (
      process.env.SITE_URL ?? "https://emperiumforgeworks.com"
    ).replace(/\/$/, "");
    const successUrl =
      event.arguments.successUrl ??
      `${siteUrl}/checkout/success?session={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      event.arguments.cancelUrl ??
      `${siteUrl}/account/print-requests/${printRequestId}`;

    const { data: request, errors } = await dataClient.models.PrintRequest.get({
      id: printRequestId,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    if (!request) {
      throw new Error("Print request not found.");
    }
    if (userId) {
      if (request.userId !== userId) {
        throw new Error("Print request not found.");
      }
    } else if (request.guestId !== verifiedGuestId) {
      throw new Error("Print request not found.");
    }
    if (request.status !== "quoted") {
      throw new Error("This print quote is not ready for payment.");
    }
    if (request.quoteCents == null || request.quoteCents <= 0) {
      throw new Error("Quote amount is invalid.");
    }

    const figureLines = parsePrintFigureLines(request.figureLines);
    if (!figureLines.length) {
      throw new Error("Quote is missing figure breakdown.");
    }

    const { data: configRow, errors: configErrors } =
      await dataClient.models.PrintServiceConfig.get({
        configKey: PRINT_SERVICE_CONFIG_KEY,
      });
    if (configErrors?.length) {
      throw new Error(configErrors.map((e) => e.message).join("; "));
    }
    const config = normalizePrintServiceConfigRow(configRow);
    if (!config?.active) {
      throw new Error("Printing as a Service is not available right now.");
    }

    const catalogSlug =
      config.catalogProductSlug?.trim() || PRINT_SERVICE_CATALOG_SLUG;
    const product = await findProductBySlug(catalogSlug);
    if (!product) {
      throw new Error(
        "Print service catalog product is missing. Contact support.",
      );
    }

    const printPayload = printServicePayloadFromQuotedRequest({
      uploadId: request.uploadId,
      storagePath: request.storagePath,
      originalFileName: request.originalFileName,
      resinTypeId: request.resinTypeId,
      resinTypeLabel: request.resinTypeLabel,
      resinColorId: request.resinColorId,
      resinColorLabel: request.resinColorLabel,
      figureLines,
      printRequestId: request.id,
    });

    const variantLabel = [
      formatPrintFigureLinesSummary(figureLines),
      request.resinTypeLabel,
      request.resinColorLabel,
    ]
      .filter(Boolean)
      .join(" · ");

    const lineItem: CheckoutLineItem = {
      productId: product.id,
      slug: product.slug,
      title: product.title?.trim() || "Printing as a Service",
      quantity: 1,
      priceCents: request.quoteCents,
      variantLabel,
      printServiceJson: JSON.stringify(printPayload),
    };

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
    const productById = new Map([[product.id, product]]);
    const shipping = resolveCartShipping(
      [lineItem],
      productById,
      profileById,
      defaultProfile,
    );

    if (userId) {
      await cancelSupersededPendingOrders(dataClient, userId);
    }

    const stripe = new Stripe(secretKey);
    let checkoutSession: Stripe.Checkout.Session | null = null;
    let orderId: string | null = null;

    try {
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

      const description = formatPrintServiceVariantLabel(printPayload);
      const metadata: Record<string, string> = {
        printRequestId: request.id,
      };
      if (userId) metadata.userId = userId;
      if (verifiedGuestId) metadata.guestId = verifiedGuestId;

      checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: request.quoteCents,
              tax_behavior: "exclusive",
              product_data: {
                name: lineItem.title,
                tax_code: STRIPE_TANGIBLE_GOODS_TAX_CODE,
                description,
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        ...(request.email?.trim()
          ? { customer_email: request.email.trim() }
          : {}),
        automatic_tax: { enabled: true },
        billing_address_collection: "required",
        shipping_address_collection: {
          allowed_countries:
            shipping.allowedCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
        },
        shipping_options: shippingOptions,
        phone_number_collection: { enabled: true },
      });

      if (!checkoutSession.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      const snapshot = {
        productId: product.id,
        slug: product.slug,
        title: lineItem.title,
        quantity: 1,
        priceCents: request.quoteCents,
        variantLabel,
        printService: printPayload,
        printServiceJson: JSON.stringify(printPayload),
      };

      const createResult = await dataClient.models.Order.create({
        externalSessionId: checkoutSession.id,
        paymentProvider: "stripe",
        status: "pending",
        lineItems: JSON.stringify([snapshot]),
        subtotalCents: request.quoteCents,
        totalCents: request.quoteCents,
        ...(userId ? { userId } : {}),
        ...(request.email?.trim() ? { email: request.email.trim() } : {}),
      });
      if (createResult.errors?.length) {
        throw new Error(createResult.errors.map((e) => e.message).join("; "));
      }
      if (!createResult.data?.id) {
        throw new Error("Could not create pending order.");
      }
      orderId = createResult.data.id;

      await stripe.checkout.sessions.update(checkoutSession.id, {
        metadata: {
          ...metadata,
          orderId,
        },
      });

      return {
        sessionId: checkoutSession.id,
        redirectUrl: checkoutSession.url,
        paymentProvider: "stripe",
      };
    } catch (err) {
      if (orderId) {
        try {
          await markPendingOrderCancelled(dataClient, orderId);
        } catch (cancelErr) {
          console.error("Could not cancel failed quote checkout order", cancelErr);
        }
      }
      if (checkoutSession?.id) {
        try {
          await stripe.checkout.sessions.expire(checkoutSession.id);
        } catch (expireErr) {
          console.warn("Could not expire failed quote checkout session", expireErr);
        }
      }
      throw err;
    }
  };
