import {
  createPaymentProvider,
  loadConfig,
  type CheckoutLineItem,
} from "@emperium/shared";
import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import {
  filterPurchasableCartLines,
  getCartLineIssues,
} from "@/lib/cartCatalog";
import { SITE_URL, APP_ENV } from "@/lib/config";
import { configureAmplify, isAmplifyConfigured } from "@/lib/amplify";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { getCustomerUserId } from "@/lib/customerAuth";
import { toOrderLineItemSnapshots } from "@/lib/orderLineItems";

function toLineItems(items: CartLine[]): CheckoutLineItem[] {
  return items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    variantId: item.variantId,
    quantity: item.quantity,
    title: item.variantLabel
      ? `${item.title} (${item.variantLabel})`
      : item.title,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
  }));
}

async function saveMockOrder(
  sessionId: string,
  items: CartLine[],
  totalCents: number,
) {
  if (!isAmplifyConfigured()) return;

  const client = await getGuestDataClient();
  if (!client) return;

  const userId = await getCustomerUserId();
  const snapshots = toOrderLineItemSnapshots(items);

  const { data, errors } = await client.models.Order.create({
    externalSessionId: sessionId,
    paymentProvider: "mock",
    status: "paid",
    lineItems: JSON.stringify(snapshots),
    totalCents,
    ...(userId ? { userId } : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  if (!data) {
    throw new Error("Order could not be saved.");
  }

  if (client.mutations.notifyOrderPlaced) {
    try {
      await client.mutations.notifyOrderPlaced({ orderId: data.id });
    } catch {
      /* Support email is best-effort for local mock checkout. */
    }
  }
}

async function startStripeCheckout(
  items: CartLine[],
  promoGrantId?: string,
) {
  const client = await getGuestDataClient();
  if (!client) {
    throw new Error("Checkout is unavailable — backend not configured.");
  }

  if (!client.mutations.createStripeCheckoutSession) {
    throw new Error(
      "Stripe checkout is not deployed. Redeploy the Amplify backend.",
    );
  }

  const base = SITE_URL.replace(/\/$/, "");
  const lineItems = toLineItems(items).map((item) => ({
    productId: item.productId,
    slug: item.slug,
    variantId: item.variantId,
    quantity: item.quantity,
    title: item.title,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
  }));

  const { data, errors } = await client.mutations.createStripeCheckoutSession({
    lineItems,
    ...(promoGrantId ? { promoGrantId } : {}),
    successUrl: `${base}/checkout/success?session={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/checkout/cancel?session={CHECKOUT_SESSION_ID}`,
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data?.redirectUrl) {
    throw new Error("Stripe checkout could not be started.");
  }

  window.location.href = data.redirectUrl;
  return data;
}

export async function startCheckout(
  items: CartLine[],
  options?: { promoGrantId?: string },
  catalogProducts: Product[] = [],
) {
  if (!items.length) {
    throw new Error("Cart is empty");
  }

  if (catalogProducts.length) {
    const issues = getCartLineIssues(items, catalogProducts);
    if (issues.some((issue) => issue.blocksCheckout)) {
      throw new Error(
        "Your cart includes items that are no longer available. Update your cart and try again.",
      );
    }
    items = filterPurchasableCartLines(items, catalogProducts);
    if (!items.length) {
      throw new Error("No available items to checkout.");
    }
  }

  await configureAmplify();

  if (APP_ENV === "deployment") {
    return startStripeCheckout(items, options?.promoGrantId);
  }

  const config = loadConfig({
    appEnv: "local",
    siteUrl: SITE_URL,
    stripeSecretKey: undefined,
  });

  const provider = createPaymentProvider(config);
  const lineItems = toLineItems(items);
  const totalCents = items.reduce(
    (n, i) => n + i.priceCents * i.quantity,
    0,
  );

  const session = await provider.createCheckoutSession(lineItems);

  if (provider.name === "mock") {
    await saveMockOrder(session.sessionId, items, totalCents);
    window.location.href = session.redirectUrl;
    return session;
  }

  window.location.href = session.redirectUrl;
  return session;
}

export function isLiveCheckoutEnabled(): boolean {
  return APP_ENV === "deployment";
}
