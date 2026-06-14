import type { generateClient } from "aws-amplify/data";
import type { Schema } from "../../data/resource";

type DataClient = ReturnType<typeof generateClient<Schema>>;

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
    throw new Error(errors.map((e) => e.message).join("; "));
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
    throw new Error(updateErrors.map((e) => e.message).join("; "));
  }
}
