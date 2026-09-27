/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_SITE_DOMAIN: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_GOOGLE_ADS_PURCHASE_CONVERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
