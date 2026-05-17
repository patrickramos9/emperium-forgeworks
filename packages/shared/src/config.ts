export type AppEnv = "local" | "deployment";

export interface AppConfig {
  appEnv: AppEnv;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  siteUrl: string;
}

export function parseAppEnv(value?: string): AppEnv {
  return value === "deployment" ? "deployment" : "local";
}

function env(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const appEnv = parseAppEnv(
    overrides.appEnv ?? env("APP_ENV") ?? env("VITE_APP_ENV"),
  );

  return {
    appEnv,
    stripeSecretKey: overrides.stripeSecretKey ?? env("STRIPE_SECRET_KEY"),
    stripeWebhookSecret:
      overrides.stripeWebhookSecret ?? env("STRIPE_WEBHOOK_SECRET"),
    siteUrl:
      overrides.siteUrl ??
      env("VITE_SITE_URL") ??
      env("SITE_URL") ??
      "http://localhost:5173",
  };
}
