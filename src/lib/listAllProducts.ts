import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";

export type ProductRecord = Schema["Product"]["type"];

/** Fetch every Product row (AppSync list calls are paginated). */
export async function listAllProducts(
  client: AmplifyDataClient,
): Promise<ProductRecord[]> {
  const rows: ProductRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Product.list({
      limit: 100,
      nextToken,
    });

    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }

    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }

    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.title.localeCompare(b.title),
  );
}

/** AppSync slug filters are unreliable on Product — scan pages and match locally. */
export async function findProductBySlug(
  client: AmplifyDataClient,
  slug: string,
): Promise<ProductRecord | null> {
  const normalized = slug.trim();
  if (!normalized) return null;
  const rows = await listAllProducts(client);
  return rows.find((row) => row.slug === normalized) ?? null;
}
