import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { listAllProducts } from "@/lib/listAllProducts";

export async function countFeaturedProducts(
  client: AmplifyDataClient,
  excludeId?: string,
): Promise<number> {
  const products = await listAllProducts(client);
  return products.filter(
    (product) => product.featured && product.id !== excludeId,
  ).length;
}
