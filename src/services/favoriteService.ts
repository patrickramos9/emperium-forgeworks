import type { Product } from "@/data/seedProducts";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { hasFavoriteModel } from "@/lib/dataModels";
import { getStoredGuestSession } from "@/services/guestSessionService";

export type FavoriteRecord = {
  productId: string;
  productSlug?: string | null;
};

export type ResolvedFavorite =
  | { status: "active"; favorite: FavoriteRecord; product: Product }
  | { status: "removed"; favorite: FavoriteRecord; displaySlug: string };

export async function isProductFavorited(
  client: AmplifyDataClient,
  userId: string,
  productId: string,
): Promise<boolean> {
  if (!hasFavoriteModel(client)) return false;
  const { data, errors } = await client.models.Favorite.get({
    userId,
    productId,
  });
  if (errors?.length) return false;
  return Boolean(data);
}

export async function listUserFavorites(
  client: AmplifyDataClient,
  userId: string,
): Promise<FavoriteRecord[]> {
  if (!hasFavoriteModel(client)) return [];
  const rows: FavoriteRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Favorite.list({
      filter: { userId: { eq: userId } },
      limit: 100,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) {
        rows.push({
          productId: row.productId,
          productSlug: row.productSlug,
        });
      }
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows;
}

export async function listGuestFavorites(
  client: AmplifyDataClient,
): Promise<FavoriteRecord[]> {
  if (!client.queries.getGuestFavorites) {
    throw new Error(
      "Guest favorites are not available yet. Redeploy the Amplify backend.",
    );
  }
  const session = getStoredGuestSession();
  if (!session) {
    throw new Error("Guest session not ready — reload and try again.");
  }

  const { data, errors } = await client.queries.getGuestFavorites({
    guestId: session.guestId,
    guestToken: session.guestToken,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return (data?.favorites ?? [])
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.productId))
    .map((row) => ({
      productId: row.productId,
      productSlug: row.productSlug,
    }));
}

export async function isGuestProductFavorited(
  client: AmplifyDataClient,
  productId: string,
): Promise<boolean> {
  const favorites = await listGuestFavorites(client);
  return favorites.some((row) => row.productId === productId);
}

/** Match saved favorites to live catalog rows; leftovers are removed-from-store. */
export function resolveFavoritesAgainstCatalog(
  favorites: FavoriteRecord[],
  products: Product[],
): ResolvedFavorite[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const resolved: ResolvedFavorite[] = [];

  for (const favorite of favorites) {
    const product =
      byId.get(favorite.productId) ??
      (favorite.productSlug ? bySlug.get(favorite.productSlug) : undefined);

    if (product) {
      resolved.push({ status: "active", favorite, product });
      continue;
    }

    resolved.push({
      status: "removed",
      favorite,
      displaySlug: favorite.productSlug?.trim() || favorite.productId,
    });
  }

  return resolved;
}

/** Favorite for a slug whose product no longer exists in catalog. */
export async function findStaleFavoriteForSlug(
  client: AmplifyDataClient,
  userId: string,
  slug: string,
  catalogProductIds: Set<string>,
): Promise<{ productId: string; productSlug?: string | null } | null> {
  const favorites = await listUserFavorites(client, userId);
  const normalized = slug.trim().toLowerCase();
  for (const row of favorites) {
    if (row.productSlug?.trim().toLowerCase() !== normalized) continue;
    if (catalogProductIds.has(row.productId)) continue;
    return row;
  }
  return null;
}

export async function toggleProductFavorite(
  client: AmplifyDataClient,
  productId: string,
  favorited: boolean,
  productSlug?: string,
  options?: { asGuest?: boolean },
): Promise<{ favorited: boolean; grantIssued: boolean }> {
  if (!client.mutations.toggleProductFavorite) {
    throw new Error(
      "Favorites API is not deployed. Redeploy the Amplify backend.",
    );
  }

  const args: {
    productId: string;
    favorited: boolean;
    productSlug?: string;
    guestId?: string;
    guestToken?: string;
  } = {
    productId,
    favorited,
    ...(productSlug ? { productSlug } : {}),
  };

  if (options?.asGuest) {
    const session = getStoredGuestSession();
    if (!session) {
      throw new Error("Guest session not ready — reload and try again.");
    }
    args.guestId = session.guestId;
    args.guestToken = session.guestToken;
  }

  const { data, errors } = await client.mutations.toggleProductFavorite(args);
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Could not update favorite.");
  }
  return data;
}
