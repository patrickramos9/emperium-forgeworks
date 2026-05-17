import type { AppConfig } from "../config.js";
import type {
  CheckoutLineItem,
  CheckoutSessionResult,
  PaymentProvider,
} from "../contracts/payments.js";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  constructor(private readonly config: AppConfig) {}

  async createCheckoutSession(
    items: CheckoutLineItem[],
    _options?: { customerEmail?: string },
  ): Promise<CheckoutSessionResult> {
    if (!items.length) {
      throw new Error("Cart is empty");
    }

    const sessionId = `mock_${crypto.randomUUID()}`;
    const base = this.config.siteUrl.replace(/\/$/, "");
    const redirectUrl = `${base}/checkout/success?session=${sessionId}&mock=1`;

    return {
      sessionId,
      redirectUrl,
      paymentProvider: "mock",
    };
  }
}
