import {
  createPaymentProvider,
  loadConfig,
  type CheckoutLineItem,
} from "@emperium/shared";
import type { CartLine } from "@/context/CartContext";
import { SITE_URL } from "@/lib/config";
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
}

export async function startCheckout(items: CartLine[]) {
  if (!items.length) {
    throw new Error("Cart is empty");
  }

  await configureAmplify();

  const config = loadConfig({
    appEnv:
      import.meta.env.VITE_APP_ENV === "deployment" ? "deployment" : "local",
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
