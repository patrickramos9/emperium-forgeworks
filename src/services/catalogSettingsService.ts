import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { CATALOG_SETTINGS_KEY } from "@/lib/catalogSettings";
import {
  DEFAULT_PRODUCT_CATEGORY_FILTERS,
  normalizeCategoryFilterName,
  validateCategoryFilterNames,
} from "@/lib/productCategories";
import { listAllProducts } from "@/lib/listAllProducts";

export type CategoryFilterRename = {
  from: string;
  to: string;
};

function requireCatalogSettingsModel(client: AmplifyDataClient) {
  const model = client.models.CatalogSettings;
  if (!model) {
    throw new Error(
      "Catalog settings are not available. Deploy the backend to edit category filters.",
    );
  }
  return model;
}

export async function getCatalogCategoryFilters(
  client: AmplifyDataClient,
): Promise<string[]> {
  const model = client.models.CatalogSettings;
  if (!model) {
    return [...DEFAULT_PRODUCT_CATEGORY_FILTERS];
  }

  const { data, errors } = await model.get({ settingsKey: CATALOG_SETTINGS_KEY });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  const filters = (data?.categoryFilters ?? [])
    .map((name) => normalizeCategoryFilterName(name ?? ""))
    .filter(Boolean);

  return filters.length > 0 ? filters : [...DEFAULT_PRODUCT_CATEGORY_FILTERS];
}

async function applyCategoryRenames(
  client: AmplifyDataClient,
  renames: CategoryFilterRename[],
): Promise<void> {
  if (!renames.length) return;

  const products = await listAllProducts(client);
  for (const { from, to } of renames) {
    for (const product of products) {
      if (product.category !== from) continue;
      const result = await client.models.Product.update({
        id: product.id,
        category: to,
      });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
    }
  }
}

export async function saveCatalogCategoryFilters(
  client: AmplifyDataClient,
  filters: string[],
  renames: CategoryFilterRename[] = [],
): Promise<string[]> {
  const normalized = filters.map(normalizeCategoryFilterName);
  const validationError = validateCategoryFilterNames(normalized);
  if (validationError) throw new Error(validationError);

  const CatalogSettings = requireCatalogSettingsModel(client);
  await applyCategoryRenames(client, renames);

  const existing = await CatalogSettings.get({ settingsKey: CATALOG_SETTINGS_KEY });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  if (existing.data) {
    const result = await CatalogSettings.update({
      settingsKey: CATALOG_SETTINGS_KEY,
      categoryFilters: normalized,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  } else {
    const result = await CatalogSettings.create({
      settingsKey: CATALOG_SETTINGS_KEY,
      categoryFilters: normalized,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  }

  return normalized;
}

export async function getProductDescriptionTemplate(
  client: AmplifyDataClient,
): Promise<string> {
  const model = client.models.CatalogSettings;
  if (!model) return "";

  const { data, errors } = await model.get({ settingsKey: CATALOG_SETTINGS_KEY });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return data?.productDescriptionTemplate?.trim() ?? "";
}

export async function saveProductDescriptionTemplate(
  client: AmplifyDataClient,
  html: string,
): Promise<void> {
  const CatalogSettings = requireCatalogSettingsModel(client);
  const trimmed = html.trim();

  const existing = await CatalogSettings.get({ settingsKey: CATALOG_SETTINGS_KEY });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  const value = trimmed || null;

  if (existing.data) {
    const result = await CatalogSettings.update({
      settingsKey: CATALOG_SETTINGS_KEY,
      productDescriptionTemplate: value,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  } else {
    const result = await CatalogSettings.create({
      settingsKey: CATALOG_SETTINGS_KEY,
      categoryFilters: [...DEFAULT_PRODUCT_CATEGORY_FILTERS],
      productDescriptionTemplate: value,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  }
}
