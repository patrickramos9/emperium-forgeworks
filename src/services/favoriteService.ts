import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { hasFavoriteModel } from "@/lib/dataModels";

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

export async function toggleProductFavorite(
  client: AmplifyDataClient,
  productId: string,
  favorited: boolean,
): Promise<{ favorited: boolean; grantIssued: boolean }> {
  if (!client.mutations.toggleProductFavorite) {
    throw new Error(
      "Favorites API is not deployed. Redeploy the Amplify backend.",
    );
  }
  const { data, errors } = await client.mutations.toggleProductFavorite({
    productId,
    favorited,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Could not update favorite.");
  }
  return data;
}
