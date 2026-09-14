import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { CATALOG_SETTINGS_KEY } from "@/lib/catalogSettings";

export async function fetchPaidSalesCount(
  client: AmplifyDataClient,
): Promise<number | null> {
  if (!client.queries.getStorefrontStats) {
    return null;
  }

  const { data, errors } = await client.queries.getStorefrontStats();
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return data?.paidSalesCount ?? null;
}

/**
 * About “Successful Forgings”: admin override from CatalogSettings when set,
 * otherwise live paid order count.
 */
export async function fetchSuccessfulForgingsCount(
  client: AmplifyDataClient,
): Promise<number | null> {
  const model = client.models.CatalogSettings;
  if (model) {
    const { data, errors } = await model.get({
      settingsKey: CATALOG_SETTINGS_KEY,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    const override = data?.aboutSuccessfulForgings;
    if (
      typeof override === "number" &&
      Number.isFinite(override) &&
      override >= 0
    ) {
      return Math.floor(override);
    }
  }

  return fetchPaidSalesCount(client);
}

export function formatSuccessfulForgings(count: number | null): string {
  if (count === null) return "—";
  return String(count);
}
