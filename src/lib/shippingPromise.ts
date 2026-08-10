/**
 * Canonical dispatch promise — keep shop banner, PDP/cart trust strip, and
 * `/shipping-returns` in sync (M23b). Ops: same-day when ordered by 6 PM ET.
 */
export const SHIPPING_DISPATCH_POLICY =
  "We usually ship the same day we receive your order. Orders placed after 6:00 PM Eastern are processed on the next business day.";

/** Short form for banners and trust strips. */
export const SHIPPING_DISPATCH_SHORT =
  "Usually ships same day — orders after 6:00 PM Eastern go out the next business day.";

/** Shop catalog banner (one sentence + contact CTA lives in the page). */
export const SHIPPING_DISPATCH_SHOP_BANNER =
  "We usually ship the same day we receive your order (after 6:00 PM Eastern → next business day).";
