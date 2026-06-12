import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { listAllProducts } from "@/lib/listAllProducts";

export async function nextProductSortOrder(
  client: AmplifyDataClient,
): Promise<number> {
  const products = await listAllProducts(client);
  const max = products.reduce(
    (highest, product) => Math.max(highest, product.sortOrder ?? 0),
    0,
  );
  return max + 1;
}

export async function saveProductSortOrders(
  client: AmplifyDataClient,
  ordered: { id: string; sortOrder: number }[],
  previous: { id: string; sortOrder: number }[],
): Promise<void> {
  const previousById = new Map(previous.map((row) => [row.id, row.sortOrder]));

  for (const row of ordered) {
    if (previousById.get(row.id) === row.sortOrder) continue;

    const result = await client.models.Product.update({
      id: row.id,
      sortOrder: row.sortOrder,
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
  }
}
