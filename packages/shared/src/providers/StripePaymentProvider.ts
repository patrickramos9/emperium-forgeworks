import type { AppConfig } from "../config.js";
import type {
  CheckoutLineItem,
  CheckoutSessionResult,
  PaymentProvider,
} from "../contracts/payments.js";

/**
 * Stripe Checkout — wire up when you have a Stripe account.
 * Install `npm install stripe` and set STRIPE_SECRET_KEY with APP_ENV=deployment.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;

  constructor(config: AppConfig) {
    if (!config.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is required for StripePaymentProvider");
    }
  }

  async createCheckoutSession(
    _items: CheckoutLineItem[],
    _options?: { customerEmail?: string },
  ): Promise<CheckoutSessionResult> {
    throw new Error(
      "Stripe checkout is not configured in this build. Install the `stripe` package and implement StripePaymentProvider, or use mock checkout (APP_ENV=local).",
    );
  }
}
