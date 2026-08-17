import type { Product, ProductVariant } from "@/data/seedProducts";
import { isPrintServiceCatalogSlug } from "@/lib/printService";

const CHECKOUT_SNAPSHOT_KEY = "metaPixel.checkout";
const PURCHASE_SENT_PREFIX = "metaPixel.purchase.";

type FbqFn = (...args: unknown[]) => void;

function getFbq(): FbqFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { fbq?: FbqFn }).fbq;
}

function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

function isCatalogTrackedSlug(
  slug: string | undefined,
  vaultOnly?: boolean,
): boolean {
  if (!slug?.trim() || vaultOnly) return false;
  return !isPrintServiceCatalogSlug(slug);
}

export type MetaPixelCatalogParams = {
  content_ids: string[];
  content_type: "product";
  contents: Array<{ id: string; quantity: number; item_price: number }>;
  value: number;
  currency: "USD";
  content_name?: string;
  content_category?: string;
  num_items?: number;
  search_string?: string;
};

type PixelCartLine = {
  slug: string;
  quantity: number;
  priceCents: number;
  vaultOnly?: boolean;
  printService?: { uploadId?: string; storagePath?: string } | null;
};

function catalogLines(lines: PixelCartLine[]): PixelCartLine[] {
  return lines.filter((line) => {
    if (!isCatalogTrackedSlug(line.slug, line.vaultOnly)) return false;
    if (line.printService?.uploadId && line.printService.storagePath) {
      return false;
    }
    return true;
  });
}

export function catalogParamsFromCartLines(
  lines: PixelCartLine[],
): MetaPixelCatalogParams | null {
  const tracked = catalogLines(lines);
  if (tracked.length === 0) return null;

  const contents = tracked.map((line) => ({
    id: line.slug,
    quantity: line.quantity,
    item_price: centsToDollars(line.priceCents),
  }));

  return {
    content_ids: [...new Set(contents.map((row) => row.id))],
    content_type: "product",
    contents,
    value: centsToDollars(
      tracked.reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
    ),
    currency: "USD",
    num_items: tracked.reduce((sum, line) => sum + line.quantity, 0),
  };
}

function track(event: string, params?: Record<string, unknown>) {
  const fbq = getFbq();
  if (!fbq) return;
  if (params) fbq("track", event, params);
  else fbq("track", event);
}

/** PageView after product microdata is in the DOM (pixel-based catalog ingest). */
export function trackMetaPageView() {
  track("PageView");
}

/** PDP view — `content_ids` match Merchant feed `id` (product slug). */
export function trackMetaViewContent(product: Product) {
  if (!isCatalogTrackedSlug(product.slug, product.vaultOnly)) return;
  track("ViewContent", {
    content_ids: [product.slug],
    content_type: "product",
    contents: [
      {
        id: product.slug,
        quantity: 1,
        item_price: centsToDollars(product.priceCents),
      },
    ],
    value: centsToDollars(product.priceCents),
    currency: "USD",
    content_name: product.title,
    content_category: product.category,
  });
}

export function trackMetaAddToCart(
  product: Product,
  quantity: number,
  variant?: ProductVariant,
) {
  if (!isCatalogTrackedSlug(product.slug, product.vaultOnly)) return;
  const priceCents = product.priceCents + (variant?.priceDeltaCents ?? 0);
  track("AddToCart", {
    content_ids: [product.slug],
    content_type: "product",
    contents: [
      {
        id: product.slug,
        quantity,
        item_price: centsToDollars(priceCents),
      },
    ],
    value: centsToDollars(priceCents * quantity),
    currency: "USD",
    content_name: variant?.label
      ? `${product.title} (${variant.label})`
      : product.title,
    content_category: product.category,
    num_items: quantity,
  });
}

export function trackMetaSearch(searchString: string, contentIds: string[]) {
  const query = searchString.trim();
  if (!query) return;
  track("Search", {
    search_string: query,
    content_ids: contentIds,
    content_type: "product",
  });
}

export function rememberMetaPixelCheckout(lines: PixelCartLine[]) {
  if (typeof sessionStorage === "undefined") return;
  const params = catalogParamsFromCartLines(lines);
  if (!params) {
    sessionStorage.removeItem(CHECKOUT_SNAPSHOT_KEY);
    return;
  }
  sessionStorage.setItem(CHECKOUT_SNAPSHOT_KEY, JSON.stringify(params));
}

export function trackMetaInitiateCheckout(lines: PixelCartLine[]) {
  const params = catalogParamsFromCartLines(lines);
  rememberMetaPixelCheckout(lines);
  if (params) track("InitiateCheckout", params);
}

export function trackMetaPurchaseOnce(orderRef: string | null) {
  if (typeof sessionStorage === "undefined") return;

  const sentKey = `${PURCHASE_SENT_PREFIX}${orderRef?.trim() || "unknown"}`;
  if (sessionStorage.getItem(sentKey)) return;

  const paramsRaw = sessionStorage.getItem(CHECKOUT_SNAPSHOT_KEY);
  if (!paramsRaw) return;

  try {
    const params = JSON.parse(paramsRaw) as MetaPixelCatalogParams;
    sessionStorage.setItem(sentKey, "1");
    sessionStorage.removeItem(CHECKOUT_SNAPSHOT_KEY);
    track("Purchase", params);
  } catch {
    /* Leave the snapshot so a retry can still send Purchase. */
  }
}
