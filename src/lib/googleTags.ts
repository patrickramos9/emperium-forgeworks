/** Google Ads + GA4 IDs (must match index.html gtag config). */
export const GA4_MEASUREMENT_ID = "G-XYMGBE2RSK";
export const GOOGLE_ADS_ID = "AW-18186091334";

/**
 * Google Ads → Goals → Conversions → Page view action.
 * Event snippet `send_to`: AW-18186091334/YdGCCN-3idAcEMb25t9D
 */
export const GOOGLE_ADS_PAGE_VIEW_SEND_TO =
  "AW-18186091334/YdGCCN-3idAcEMb25t9D";

/**
 * Purchase conversion `send_to` (category must be Purchase / sales).
 * Shape: `AW-18186091334/XXXXXXXXXXXXXXXXXXXX`
 * Set via Amplify env `VITE_GOOGLE_ADS_PURCHASE_CONVERSION` when you create it.
 */
export const GOOGLE_ADS_PURCHASE_SEND_TO = (
  import.meta.env.VITE_GOOGLE_ADS_PURCHASE_CONVERSION as string | undefined
)?.trim() || "";

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { gtag?: GtagFn }).gtag;
}

type TrackGooglePageViewOptions = {
  /** Limit which tags receive this hit. Default: GA4 + Google Ads. */
  sendTo?: string | string[];
};

/** SPA / virtual page view for GA4 and/or Google Ads. */
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

  // Page-view conversion action (separate from the base AW config page_view).
  gtag("event", "conversion", {
    send_to: GOOGLE_ADS_PAGE_VIEW_SEND_TO,
  });
}

const PURCHASE_SENT_PREFIX = "googleAds.purchase.";

export type GoogleAdsPurchaseOrder = {
  status?: string | null;
  externalSessionId?: string | null;
  totalCents?: number | null;
};

/**
 * Fire the Google Ads purchase conversion once per checkout session.
 * Requires a Purchase conversion action + `VITE_GOOGLE_ADS_PURCHASE_CONVERSION`.
 */
export function trackGoogleAdsPurchaseOnce(order: GoogleAdsPurchaseOrder) {
  if (typeof sessionStorage === "undefined") return;
  if (order.status !== "paid") return;

  const sendTo = GOOGLE_ADS_PURCHASE_SEND_TO;
  if (!sendTo.startsWith(`${GOOGLE_ADS_ID}/`)) {
    return;
  }

  const orderRef = order.externalSessionId?.trim();
  if (!orderRef) return;
  const sentKey = `${PURCHASE_SENT_PREFIX}${orderRef}`;
  if (sessionStorage.getItem(sentKey)) return;

  const totalCents = Number(order.totalCents);
  if (!Number.isFinite(totalCents) || totalCents < 0) return;

  const gtag = getGtag();
  if (!gtag) return;

  gtag("event", "conversion", {
    send_to: sendTo,
    value: Math.round(totalCents) / 100,
    currency: "USD",
    transaction_id: orderRef,
  });

  sessionStorage.setItem(sentKey, "1");
}
