import type { Product, ProductVariant } from "@/data/seedProducts";

/** Google Ads + GA4 IDs (must match index.html gtag config). */
export const GA4_MEASUREMENT_ID = "G-XYMGBE2RSK";
export const GOOGLE_ADS_ID = "AW-18186091334";

/**
 * Optional Google Ads purchase conversion snippet.
 * Shape: `AW-18186091334/XXXXXXXXXXXXXXXXXXXX`
 * Set via `VITE_GOOGLE_ADS_PURCHASE_CONVERSION` after you create a Purchase action.
 * When unset, the purchase event is still sent to GA4 and to the Ads tag.
 */
export const GOOGLE_ADS_PURCHASE_SEND_TO = (
  import.meta.env.VITE_GOOGLE_ADS_PURCHASE_CONVERSION as string | undefined
)?.trim() || "";

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { gtag?: GtagFn }).gtag;
}

function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

type Ga4Item = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_variant?: string;
  item_category?: string;
};

function trackGa4Event(
  name: string,
  params: Record<string, unknown>,
): boolean {
  const gtag = getGtag();
  if (!gtag) return false;
  gtag("event", name, {
    ...params,
    send_to: GA4_MEASUREMENT_ID,
  });
  return true;
}

type TrackGooglePageViewOptions = {
  /** Limit which tags receive this hit. Default: GA4 + Google Ads. */
  sendTo?: string | string[];
};

/**
 * SPA page view for GA4 and Google Ads audiences.
 * This is not a conversion. Counting page views as conversions trained
 * Performance Max on browsers instead of buyers.
 */
export function trackGooglePageView(
  path: string,
  title?: string,
  options?: TrackGooglePageViewOptions,
) {
  const gtag = getGtag();
  if (!gtag) return;

  gtag("event", "page_view", {
    page_path: path,
    page_title: title || (typeof document !== "undefined" ? document.title : ""),
    page_location:
      typeof window !== "undefined" ? window.location.href : undefined,
    send_to: options?.sendTo ?? [GA4_MEASUREMENT_ID, GOOGLE_ADS_ID],
  });
}

const PURCHASE_SENT_PREFIX = "google.purchase.";

type PurchaseLine = {
  slug?: string | null;
  productId?: string | null;
  title?: string | null;
  quantity?: number | null;
  priceCents?: number | null;
  variantLabel?: string | null;
};

export type GooglePurchaseOrder = {
  status?: string | null;
  externalSessionId?: string | null;
  totalCents?: number | null;
  taxCents?: number | null;
  shippingCents?: number | null;
  lineItems?: unknown;
};

function parsePurchaseLines(raw: unknown): PurchaseLine[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed as PurchaseLine[];
  } catch {
    return [];
  }
}

function itemsFromLines(
  lines: Array<{
    itemId: string;
    itemName: string;
    priceCents: number;
    quantity: number;
    itemVariant?: string;
    itemCategory?: string;
  }>,
): Ga4Item[] {
  return lines
    .filter((line) => {
      const quantity = Number(line.quantity);
      const priceCents = Number(line.priceCents);
      return (
        Boolean(line.itemId.trim()) &&
        Boolean(line.itemName.trim()) &&
        Number.isFinite(quantity) &&
        quantity > 0 &&
        Number.isFinite(priceCents) &&
        priceCents >= 0
      );
    })
    .map((line) => {
      const item: Ga4Item = {
        item_id: line.itemId.trim(),
        item_name: line.itemName.trim(),
        price: centsToDollars(line.priceCents),
        quantity: Math.floor(Number(line.quantity)),
      };
      const variant = line.itemVariant?.trim();
      const category = line.itemCategory?.trim();
      if (variant) item.item_variant = variant;
      if (category) item.item_category = category;
      return item;
    });
}

function itemsFromOrder(raw: unknown): Ga4Item[] {
  return itemsFromLines(
    parsePurchaseLines(raw).map((line) => ({
      itemId: (line.slug || line.productId || "").trim(),
      itemName: (line.title || line.slug || "Item").trim(),
      priceCents: Number(line.priceCents),
      quantity: Number(line.quantity),
      itemVariant: line.variantLabel ?? undefined,
    })),
  );
}

function optionalCents(value: number | null | undefined): number | undefined {
  if (value == null) return undefined;
  const cents = Number(value);
  if (!Number.isFinite(cents) || cents < 0) return undefined;
  return centsToDollars(cents);
}

export function trackGoogleViewItem(product: Product) {
  const itemId = product.slug?.trim() || product.id?.trim();
  const itemName = product.title?.trim();
  if (!itemId || !itemName) return;
  const priceCents = Number(product.priceCents);
  if (!Number.isFinite(priceCents) || priceCents < 0) return;

  trackGa4Event("view_item", {
    currency: "USD",
    value: centsToDollars(priceCents),
    items: itemsFromLines([
      {
        itemId,
        itemName,
        priceCents,
        quantity: 1,
        itemCategory: product.category,
      },
    ]),
  });
}

export function trackGoogleAddToCart(
  product: Product,
  quantity: number,
  variant?: ProductVariant,
) {
  const itemId = product.slug?.trim() || product.id?.trim();
  const itemName = product.title?.trim();
  if (!itemId || !itemName) return;
  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1) return;
  const priceCents = product.priceCents + (variant?.priceDeltaCents ?? 0);
  if (!Number.isFinite(priceCents) || priceCents < 0) return;

  trackGa4Event("add_to_cart", {
    currency: "USD",
    value: centsToDollars(priceCents * qty),
    items: itemsFromLines([
      {
        itemId,
        itemName,
        priceCents,
        quantity: qty,
        itemVariant: variant?.label,
        itemCategory: product.category,
      },
    ]),
  });
}

export type GoogleCheckoutLine = {
  slug?: string | null;
  productId?: string | null;
  title?: string | null;
  priceCents?: number | null;
  quantity?: number | null;
  variantLabel?: string | null;
};

export function trackGoogleBeginCheckout(lines: GoogleCheckoutLine[]) {
  const items = itemsFromLines(
    lines.map((line) => ({
      itemId: (line.slug || line.productId || "").trim(),
      itemName: (line.title || line.slug || "Item").trim(),
      priceCents: Number(line.priceCents),
      quantity: Number(line.quantity),
      itemVariant: line.variantLabel ?? undefined,
    })),
  );
  if (!items.length) return;

  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  trackGa4Event("begin_checkout", {
    currency: "USD",
    value,
    items,
  });
}

/**
 * Fire one purchase per paid checkout.
 * GA4 always receives `purchase`. Google Ads receives the labeled conversion
 * when `VITE_GOOGLE_ADS_PURCHASE_CONVERSION` is set, otherwise the same
 * `purchase` event on the Ads tag so it can be selected as a conversion.
 */
export function trackGooglePurchaseOnce(order: GooglePurchaseOrder) {
  if (typeof sessionStorage === "undefined") return;
  if (order.status !== "paid") return;

  const orderRef = order.externalSessionId?.trim();
  if (!orderRef) return;
  const sentKey = `${PURCHASE_SENT_PREFIX}${orderRef}`;
  if (sessionStorage.getItem(sentKey)) return;

  const totalCents = Number(order.totalCents);
  if (!Number.isFinite(totalCents) || totalCents < 0) return;

  const gtag = getGtag();
  if (!gtag) return;

  const value = centsToDollars(totalCents);
  const tax = optionalCents(order.taxCents);
  const shipping = optionalCents(order.shippingCents);
  const params: Record<string, unknown> = {
    transaction_id: orderRef,
    value,
    currency: "USD",
    items: itemsFromOrder(order.lineItems),
  };
  if (tax != null) params.tax = tax;
  if (shipping != null) params.shipping = shipping;

  gtag("event", "purchase", {
    ...params,
    send_to: GA4_MEASUREMENT_ID,
  });

  const sendTo = GOOGLE_ADS_PURCHASE_SEND_TO;
  if (sendTo.startsWith(`${GOOGLE_ADS_ID}/`)) {
    gtag("event", "conversion", {
      send_to: sendTo,
      value,
      currency: "USD",
      transaction_id: orderRef,
    });
  } else {
    gtag("event", "purchase", {
      ...params,
      send_to: GOOGLE_ADS_ID,
    });
  }

  sessionStorage.setItem(sentKey, "1");
}
