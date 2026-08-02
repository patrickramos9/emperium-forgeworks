export const APP_ENV =
  import.meta.env.VITE_APP_ENV === "deployment" ? "deployment" : "local";

export const IS_LOCAL = APP_ENV === "local";

export const SITE_URL =
  import.meta.env.VITE_SITE_URL ?? "http://localhost:5173";

export const SITE_DOMAIN =
  import.meta.env.VITE_SITE_DOMAIN ?? "emperiumforgeworks.com";

/** Legal entity — must match Merchant Center / Payments. */
export const BUSINESS_LEGAL_NAME = "Emperium Forgeworks LLC";

export const CONTACT_EMAIL = "melissa@emperiumforgeworks.com";

/** Customer service phone — must match Merchant Center. */
export const CONTACT_PHONE = "954-249-8475";
export const CONTACT_PHONE_TEL = "+19542498475";
export const CONTACT_PHONE_DISPLAY = "(954) 249-8475";

/** Public business address — must match Merchant Center. */
export const BUSINESS_ADDRESS = {
  streetAddress: "5420 SW 130th Ave",
  addressLocality: "Miramar",
  addressRegion: "FL",
  postalCode: "33027",
  addressCountry: "US",
} as const;

export const BUSINESS_ADDRESS_LINES = [
  BUSINESS_ADDRESS.streetAddress,
  `${BUSINESS_ADDRESS.addressLocality}, ${BUSINESS_ADDRESS.addressRegion} ${BUSINESS_ADDRESS.postalCode}`,
] as const;

export const BUSINESS_ADDRESS_ONE_LINE = `${BUSINESS_ADDRESS.streetAddress}, ${BUSINESS_ADDRESS.addressLocality}, ${BUSINESS_ADDRESS.addressRegion} ${BUSINESS_ADDRESS.postalCode}`;

/** Absolute logo URL for Organization schema / Merchant trust signals. */
export const BUSINESS_LOGO_URL = `${SITE_URL.replace(/\/$/, "")}/favicon.svg`;

/** Shown to customers when a return is approved (M16). */
export const RETURN_SHIP_INSTRUCTIONS = `Ship returns to: ${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS_ONE_LINE}. Contact ${CONTACT_EMAIL} or ${CONTACT_PHONE_DISPLAY} with your order number before shipping. Buyer pays return shipping per our returns policy.`;

/** Public Etsy shop reviews page — default outbound link for imported reviews. */
export const ETSY_SHOP_REVIEWS_URL =
  "https://www.etsy.com/shop/EmperiumForgeworks/reviews";

export const PLAUSIBLE_DOMAIN =
  import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim() || undefined;

/** Inline TrustedSite badges for the footer — copy types from TrustedSite dashboard → Trustmarks. */
export const TRUSTED_SITE_FOOTER_BADGES: ReadonlyArray<{
  type: number;
  width: number;
  height: number;
}> = [
  { type: 202, width: 120, height: 50 },
];
