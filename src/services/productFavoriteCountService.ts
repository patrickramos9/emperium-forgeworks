import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { hasFavoriteModel } from "@/lib/dataModels";
import { listAllProducts } from "@/lib/listAllProducts";

const BACKFILL_SESSION_KEY = "adminProductFavoriteCountsBackfill";

async function listAllFavoriteProductIds(
  client: AmplifyDataClient,
): Promise<string[]> {
  const ids: string[] = [];

  async function listModel(
    list: (args: {
      limit: number;
      nextToken?: string;
    }) => Promise<{
      data?: Array<{ productId?: string | null } | null> | null;
      nextToken?: string | null;
      errors?: Array<{ message: string }> | null;
    }>,
  ) {
    let nextToken: string | undefined;
    do {
      const response = await list({ limit: 100, nextToken });
      if (response.errors?.length) {
        throw new Error(response.errors.map((e) => e.message).join("; "));
      }
      for (const row of response.data ?? []) {
        const productId = row?.productId?.trim();
        if (productId) ids.push(productId);
      }
      nextToken = response.nextToken ?? undefined;
    } while (nextToken);
  }

  if (client.models.Favorite) {
    await listModel((args) => client.models.Favorite!.list(args));
  }
  if (client.models.GuestFavorite) {
    await listModel((args) => client.models.GuestFavorite!.list(args));
  }

  return ids;
}

/** One-time per browser session: align Product.favoriteCount with user + guest favorites. */
export async function backfillProductFavoriteCountsIfNeeded(
  client: AmplifyDataClient,
): Promise<void> {
  if (sessionStorage.getItem(BACKFILL_SESSION_KEY) === "1") return;
  if (!hasFavoriteModel(client)) return;

  const favoriteProductIds = await listAllFavoriteProductIds(client);
  const counts = new Map<string, number>();

  for (const productId of favoriteProductIds) {
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
