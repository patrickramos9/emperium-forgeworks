/** Google Ads + GA4 IDs (must match index.html gtag config). */
export const GA4_MEASUREMENT_ID = "G-XYMGBE2RSK";
export const GOOGLE_ADS_ID = "AW-18186091334";

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
}
