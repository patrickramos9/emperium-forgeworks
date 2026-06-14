import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { hasFavoriteModel } from "@/lib/dataModels";
import { listAllProducts } from "@/lib/listAllProducts";
import type { Schema } from "../../amplify/data/resource";

const BACKFILL_SESSION_KEY = "adminProductFavoriteCountsBackfill";

async function listAllFavorites(
  client: AmplifyDataClient,
): Promise<Schema["Favorite"]["type"][]> {
  const Favorite = client.models.Favorite;
  if (!Favorite) return [];

  const rows: Schema["Favorite"]["type"][] = [];
  let nextToken: string | undefined;

  do {
    const response = await Favorite.list({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows;
}

/** One-time per browser session: align Product.favoriteCount with Favorite rows. */
export async function backfillProductFavoriteCountsIfNeeded(
  client: AmplifyDataClient,
): Promise<void> {
  if (sessionStorage.getItem(BACKFILL_SESSION_KEY) === "1") return;
  if (!hasFavoriteModel(client)) return;

  const favorites = await listAllFavorites(client);
  const counts = new Map<string, number>();

  for (const favorite of favorites) {
    const productId = favorite.productId?.trim();
    if (!productId) continue;
    counts.set(productId, (counts.get(productId) ?? 0) + 1);
  }

  const products = await listAllProducts(client);
  await Promise.all(
    products.map(async (product) => {
      const next = counts.get(product.id) ?? 0;
      if ((product.favoriteCount ?? 0) === next) return;
      const { errors } = await client.models.Product.update({
        id: product.id,
        favoriteCount: next,
      });
      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join("; "));
      }
    }),
  );

  sessionStorage.setItem(BACKFILL_SESSION_KEY, "1");
}
