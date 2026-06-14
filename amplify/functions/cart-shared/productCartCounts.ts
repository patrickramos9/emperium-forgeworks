import type { generateClient } from "aws-amplify/data";
import type { Schema } from "../../data/resource";

type DataClient = ReturnType<typeof generateClient<Schema>>;

type CartLineLike = {
  productId?: string | null;
  quantity?: number | null;
};

export function productIdsInCartLines(lines: CartLineLike[]): Set<string> {
  const ids = new Set<string>();
  for (const row of lines) {
    const productId = row.productId?.trim();
    if (productId && (row.quantity ?? 0) > 0) {
      ids.add(productId);
    }
  }
  return ids;
}

async function adjustProductCartCount(
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

  const current = product.activeCartCount ?? 0;
  const next = Math.max(0, current + delta);
  if (next === current) return;

  const { errors: updateErrors } = await client.models.Product.update({
    id: productId,
    activeCartCount: next,
  });
  if (updateErrors?.length) {
    throw new Error(updateErrors.map((e) => e.message).join("; "));
  }
}

/** Distinct signed-in carts containing each product — one per user cart snapshot. */
export async function applyProductCartCountDelta(
  client: DataClient,
  previousIds: Set<string>,
  nextIds: Set<string>,
): Promise<void> {
  const removed = [...previousIds].filter((id) => !nextIds.has(id));
  const added = [...nextIds].filter((id) => !previousIds.has(id));

  for (const productId of removed) {
    await adjustProductCartCount(client, productId, -1);
  }
  for (const productId of added) {
    await adjustProductCartCount(client, productId, 1);
  }
}
