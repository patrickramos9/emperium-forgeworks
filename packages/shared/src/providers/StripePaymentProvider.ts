import Stripe from "stripe";
import type { AppConfig } from "../config.js";
import type {
  CheckoutLineItem,
  CheckoutSessionResult,
  CreateCheckoutSessionOptions,
  PaymentProvider,
} from "../contracts/payments.js";

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;

  private readonly stripe: Stripe;
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    if (!config.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is required for StripePaymentProvider");
    }
    this.config = config;
    this.stripe = new Stripe(config.stripeSecretKey);
  }

  async createCheckoutSession(
    items: CheckoutLineItem[],
    options: CreateCheckoutSessionOptions = {},
  ): Promise<CheckoutSessionResult> {
    if (!items.length) {
      throw new Error("Cart is empty");
    }

    const base = this.config.siteUrl.replace(/\/$/, "");
    const successUrl =
      options.successUrl ??
      `${base}/checkout/success?session={CHECKOUT_SESSION_ID}`;
    const cancelUrl = options.cancelUrl ?? `${base}/checkout/cancel`;

    const session = await this.stripe.checkout.sessions.create({
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
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: options.customerEmail,
      metadata: options.metadata,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return {
      sessionId: session.id,
      redirectUrl: session.url,
      paymentProvider: "stripe",
    };
  }
}
