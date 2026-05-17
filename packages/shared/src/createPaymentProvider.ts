import type { AppConfig } from "./config.js";
import type { PaymentProvider } from "./contracts/payments.js";
import { MockPaymentProvider } from "./providers/MockPaymentProvider.js";
import { StripePaymentProvider } from "./providers/StripePaymentProvider.js";

export function createPaymentProvider(config: AppConfig): PaymentProvider {
  if (config.appEnv === "deployment" && config.stripeSecretKey) {
    return new StripePaymentProvider(config);
  }
  return new MockPaymentProvider(config);
}
