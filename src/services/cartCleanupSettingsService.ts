import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { CATALOG_SETTINGS_KEY } from "@/lib/catalogSettings";
import { DEFAULT_PRODUCT_CATEGORY_FILTERS } from "@/lib/productCategories";

export type CartCleanupScope = "guest" | "signed_in" | "both";

export type CartCleanupSettings = {
  enabled: boolean;
  idleDays: number;
  scope: CartCleanupScope;
};

/** Per-path Resend toggles (Admin → Settings). Defaults on when unset. */
export type EmailChannelSettings = {
  newOrderSupport: boolean;
  orderPaid: boolean;
  orderShipped: boolean;
  shopMessage: boolean;
  printQuote: boolean;
  printDeclined: boolean;
};

export type StoreOpsSettings = {
  /** Master switch — off skips all Resend mail. */
  emailNotificationsEnabled: boolean;
  emailChannels: EmailChannelSettings;
  cartCleanup: CartCleanupSettings;
};

export const DEFAULT_CART_CLEANUP_SETTINGS: CartCleanupSettings = {
  enabled: false,
  idleDays: 90,
  scope: "guest",
};

export const DEFAULT_EMAIL_CHANNEL_SETTINGS: EmailChannelSettings = {
  newOrderSupport: true,
  orderPaid: true,
  orderShipped: true,
  shopMessage: true,
  printQuote: true,
  printDeclined: true,
};

export const DEFAULT_STORE_OPS_SETTINGS: StoreOpsSettings = {
  emailNotificationsEnabled: true,
  emailChannels: { ...DEFAULT_EMAIL_CHANNEL_SETTINGS },
  cartCleanup: { ...DEFAULT_CART_CLEANUP_SETTINGS },
};

export type IdleCartCleanupResult = {
  ran: boolean;
  skipped: boolean;
  guestDeleted: number;
  signedInDeleted: number;
  grantsRevoked: number;
  message: string;
};

function requireCatalogSettingsModel(client: AmplifyDataClient) {
  const model = client.models.CatalogSettings;
  if (!model) {
    throw new Error(
      "Catalog settings are not available. Deploy the backend to edit settings.",
    );
  }
  return model;
}

function normalizeScope(raw: string | null | undefined): CartCleanupScope {
  if (raw === "guest" || raw === "signed_in" || raw === "both") return raw;
  return DEFAULT_CART_CLEANUP_SETTINGS.scope;
}

function normalizeIdleDays(raw: number | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 1) {
    return Math.min(Math.floor(raw), 3650);
  }
  return DEFAULT_CART_CLEANUP_SETTINGS.idleDays;
}

function flagOn(raw: boolean | null | undefined): boolean {
  return raw !== false;
}

function mapRow(
  data: {
    emailNotificationsEnabled?: boolean | null;
    emailNewOrderSupportEnabled?: boolean | null;
    emailOrderPaidEnabled?: boolean | null;
    emailOrderShippedEnabled?: boolean | null;
    emailShopMessageEnabled?: boolean | null;
    emailPrintQuoteEnabled?: boolean | null;
    emailPrintDeclinedEnabled?: boolean | null;
    cartCleanupEnabled?: boolean | null;
    cartCleanupIdleDays?: number | null;
    cartCleanupScope?: string | null;
  } | null | undefined,
): StoreOpsSettings {
  return {
    emailNotificationsEnabled: flagOn(data?.emailNotificationsEnabled),
    emailChannels: {
      newOrderSupport: flagOn(data?.emailNewOrderSupportEnabled),
      orderPaid: flagOn(data?.emailOrderPaidEnabled),
      orderShipped: flagOn(data?.emailOrderShippedEnabled),
      shopMessage: flagOn(data?.emailShopMessageEnabled),
      printQuote: flagOn(data?.emailPrintQuoteEnabled),
      printDeclined: flagOn(data?.emailPrintDeclinedEnabled),
    },
    cartCleanup: {
      enabled: data?.cartCleanupEnabled === true,
      idleDays: normalizeIdleDays(data?.cartCleanupIdleDays ?? undefined),
      scope: normalizeScope(data?.cartCleanupScope ?? undefined),
    },
  };
}

export async function fetchStoreOpsSettings(
  client: AmplifyDataClient,
): Promise<StoreOpsSettings> {
  const model = client.models.CatalogSettings;
  if (!model) {
    return {
      ...DEFAULT_STORE_OPS_SETTINGS,
      emailChannels: { ...DEFAULT_EMAIL_CHANNEL_SETTINGS },
      cartCleanup: { ...DEFAULT_CART_CLEANUP_SETTINGS },
    };
  }

  const { data, errors } = await model.get({ settingsKey: CATALOG_SETTINGS_KEY });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return mapRow(data);
}

/** @deprecated Prefer fetchStoreOpsSettings */
export async function fetchCartCleanupSettings(
  client: AmplifyDataClient,
): Promise<CartCleanupSettings> {
  const settings = await fetchStoreOpsSettings(client);
  return settings.cartCleanup;
}

export async function saveStoreOpsSettings(
  client: AmplifyDataClient,
  settings: StoreOpsSettings,
): Promise<StoreOpsSettings> {
  const CatalogSettings = requireCatalogSettingsModel(client);
  const next: StoreOpsSettings = {
    emailNotificationsEnabled: settings.emailNotificationsEnabled !== false,
    emailChannels: {
      newOrderSupport: settings.emailChannels.newOrderSupport !== false,
      orderPaid: settings.emailChannels.orderPaid !== false,
      orderShipped: settings.emailChannels.orderShipped !== false,
      shopMessage: settings.emailChannels.shopMessage !== false,
      printQuote: settings.emailChannels.printQuote !== false,
      printDeclined: settings.emailChannels.printDeclined !== false,
    },
    cartCleanup: {
      enabled: settings.cartCleanup.enabled,
      idleDays: normalizeIdleDays(settings.cartCleanup.idleDays),
      scope: normalizeScope(settings.cartCleanup.scope),
    },
  };

  const existing = await CatalogSettings.get({ settingsKey: CATALOG_SETTINGS_KEY });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  const payload = {
    emailNotificationsEnabled: next.emailNotificationsEnabled,
    emailNewOrderSupportEnabled: next.emailChannels.newOrderSupport,
    emailOrderPaidEnabled: next.emailChannels.orderPaid,
    emailOrderShippedEnabled: next.emailChannels.orderShipped,
    emailShopMessageEnabled: next.emailChannels.shopMessage,
    emailPrintQuoteEnabled: next.emailChannels.printQuote,
    emailPrintDeclinedEnabled: next.emailChannels.printDeclined,
    cartCleanupEnabled: next.cartCleanup.enabled,
    cartCleanupIdleDays: next.cartCleanup.idleDays,
    cartCleanupScope: next.cartCleanup.scope,
  };

  if (existing.data) {
    const result = await CatalogSettings.update({
      settingsKey: CATALOG_SETTINGS_KEY,
      ...payload,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  } else {
    const result = await CatalogSettings.create({
      settingsKey: CATALOG_SETTINGS_KEY,
      categoryFilters: [...DEFAULT_PRODUCT_CATEGORY_FILTERS],
      ...payload,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  }

  return next;
}

/** @deprecated Prefer saveStoreOpsSettings */
export async function saveCartCleanupSettings(
  client: AmplifyDataClient,
  settings: CartCleanupSettings,
): Promise<CartCleanupSettings> {
  const current = await fetchStoreOpsSettings(client);
  const saved = await saveStoreOpsSettings(client, {
    ...current,
    cartCleanup: settings,
  });
  return saved.cartCleanup;
}

export async function runIdleCartCleanup(
  client: AmplifyDataClient,
  overrides?: Partial<Pick<CartCleanupSettings, "idleDays" | "scope">>,
): Promise<IdleCartCleanupResult> {
  if (!client.mutations.runIdleCartCleanup) {
    throw new Error(
      "Idle cart cleanup is not available. Deploy the backend to enable it.",
    );
  }

  const { data, errors } = await client.mutations.runIdleCartCleanup({
    idleDays: overrides?.idleDays,
    scope: overrides?.scope,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Cleanup returned no result.");
  }

  return {
    ran: data.ran,
    skipped: data.skipped,
    guestDeleted: data.guestDeleted,
    signedInDeleted: data.signedInDeleted,
    grantsRevoked: data.grantsRevoked,
    message: data.message,
  };
}
