export interface CheckoutLineItem {
  productId: string;
  slug: string;
  variantId?: string;
  quantity: number;
  title: string;
  priceCents: number;
  imageUrl?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  redirectUrl: string;
  paymentProvider: "mock" | "stripe";
}

export interface CreateCheckoutSessionOptions {
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface CreateOrderInput {
  externalSessionId: string;
  paymentProvider: "mock" | "stripe";
  email?: string;
  lineItems: CheckoutLineItem[];
  totalCents: number;
}

export interface PaymentProvider {
  readonly name: "mock" | "stripe";
  createCheckoutSession(
    items: CheckoutLineItem[],
    options?: CreateCheckoutSessionOptions,
  ): Promise<CheckoutSessionResult>;
}
