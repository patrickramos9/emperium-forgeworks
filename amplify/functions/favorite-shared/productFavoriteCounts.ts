import type { SharedDataClient } from "../promo-shared/dataClient.js";

type DataClient = SharedDataClient;

export async function adjustProductFavoriteCount(
  client: DataClient,
  productId: string,
  delta: number,
): Promise<void> {
  if (!delta) return;

  const { data: product, errors } = await client.models.Product.get({
    id: productId,
  });
  if (errors?.length) {
    throw new Error(errors.map((e: { message: string }) => e.message).join("; "));
  }
  if (!product) return;

  const current = product.favoriteCount ?? 0;
  const next = Math.max(0, current + delta);
  if (next === current) return;

  const { errors: updateErrors } = await client.models.Product.update({
    id: productId,
    favoriteCount: next,
  });
  if (updateErrors?.length) {
    throw new Error(
      updateErrors.map((e: { message: string }) => e.message).join("; "),
    );
  }
}
