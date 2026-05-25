export const APP_ENV =
  import.meta.env.VITE_APP_ENV === "deployment" ? "deployment" : "local";

export const IS_LOCAL = APP_ENV === "local";

export const SITE_URL =
  import.meta.env.VITE_SITE_URL ?? "http://localhost:5173";

export const SITE_DOMAIN =
  import.meta.env.VITE_SITE_DOMAIN ?? "emperiumforgeworks.com";

export const CONTACT_EMAIL = "melissa@emperiumforgeworks.com";

export const PLAUSIBLE_DOMAIN =
  import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim() || undefined;
