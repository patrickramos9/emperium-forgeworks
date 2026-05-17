export const APP_ENV =
  import.meta.env.VITE_APP_ENV === "deployment" ? "deployment" : "local";

export const IS_LOCAL = APP_ENV === "local";

export const SITE_URL =
  import.meta.env.VITE_SITE_URL ?? "http://localhost:5173";

export const SITE_DOMAIN =
  import.meta.env.VITE_SITE_DOMAIN ?? "emperiumforgeworks.com";
