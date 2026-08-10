import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { CATALOG_SETTINGS_KEY } from "@/lib/catalogSettings";
import { DEFAULT_PRODUCT_CATEGORY_FILTERS } from "@/lib/productCategories";

export type CartCleanupScope = "guest" | "signed_in" | "both";

export type CartCleanupSettings = {
  enabled: boolean;
  idleDays: number;
  scope: CartCleanupScope;
};

export const DEFAULT_CART_CLEANUP_SETTINGS: CartCleanupSettings = {
  enabled: false,
  idleDays: 90,
  scope: "guest",
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
      "Catalog settings are not available. Deploy the backend to edit cart cleanup.",
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

export async function fetchCartCleanupSettings(
  client: AmplifyDataClient,
): Promise<CartCleanupSettings> {
  const model = client.models.CatalogSettings;
  if (!model) return { ...DEFAULT_CART_CLEANUP_SETTINGS };

  const { data, errors } = await model.get({ settingsKey: CATALOG_SETTINGS_KEY });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return {
    enabled: data?.cartCleanupEnabled === true,
    idleDays: normalizeIdleDays(data?.cartCleanupIdleDays ?? undefined),
    scope: normalizeScope(data?.cartCleanupScope ?? undefined),
  };
}

export async function saveCartCleanupSettings(
  client: AmplifyDataClient,
  settings: CartCleanupSettings,
): Promise<CartCleanupSettings> {
  const CatalogSettings = requireCatalogSettingsModel(client);
  const next: CartCleanupSettings = {
    enabled: settings.enabled,
    idleDays: normalizeIdleDays(settings.idleDays),
    scope: normalizeScope(settings.scope),
  };

  const existing = await CatalogSettings.get({ settingsKey: CATALOG_SETTINGS_KEY });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  if (existing.data) {
    const result = await CatalogSettings.update({
      settingsKey: CATALOG_SETTINGS_KEY,
      cartCleanupEnabled: next.enabled,
      cartCleanupIdleDays: next.idleDays,
      cartCleanupScope: next.scope,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  } else {
    const result = await CatalogSettings.create({
      settingsKey: CATALOG_SETTINGS_KEY,
      categoryFilters: [...DEFAULT_PRODUCT_CATEGORY_FILTERS],
      cartCleanupEnabled: next.enabled,
      cartCleanupIdleDays: next.idleDays,
      cartCleanupScope: next.scope,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  }

  return next;
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
