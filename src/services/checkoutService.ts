import {
  createPaymentProvider,
  loadConfig,
  type CheckoutLineItem,
} from "@emperium/shared";
import type { CartLine } from "@/context/CartContext";
import { SITE_URL } from "@/lib/config";
import { configureAmplify, isAmplifyConfigured } from "@/lib/amplify";

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

  try {
    const { generateClient } = await import("aws-amplify/data");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = generateClient<any>();
    await client.models.Order.create({
      externalSessionId: sessionId,
      paymentProvider: "mock",
      status: "paid",
      lineItems: JSON.stringify(items),
      totalCents,
    });
  } catch {
    /* orders optional without sandbox */
  }
}

export async function startCheckout(items: CartLine[]) {
  await configureAmplify();

  const config = loadConfig({
    appEnv: import.meta.env.VITE_APP_ENV === "deployment" ? "deployment" : "local",
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
    if (session.redirectUrl.startsWith("http")) {
      window.location.href = session.redirectUrl;
    } else {
      window.location.href = session.redirectUrl;
    }
    return session;
  }

  window.location.href = session.redirectUrl;
  return session;
}
