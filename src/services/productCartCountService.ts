import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { productIdsInCartLines } from "@/lib/productCartCounts";
import { listAllProducts } from "@/lib/listAllProducts";

const BACKFILL_SESSION_KEY = "adminProductCartCountsBackfill";

type CartLineLike = {
  productId?: string | null;
  quantity?: number | null;
};

function parseSnapshotLineItems(raw: unknown): CartLineLike[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return parseSnapshotLineItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is CartLineLike =>
      row != null && typeof row === "object" && "productId" in row,
  );
}

async function listAllCartSnapshots(client: AmplifyDataClient) {
  const CartSnapshot = client.models.CartSnapshot;
  if (!CartSnapshot) return [];

  const rows: NonNullable<Awaited<ReturnType<typeof CartSnapshot.list>>["data"]> =
    [];
  let nextToken: string | undefined;

  do {
    const response = await CartSnapshot.list({ limit: 100, nextToken });
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

/** One-time per browser session: align Product.activeCartCount with CartSnapshot rows. */
export async function backfillProductCartCountsIfNeeded(
  client: AmplifyDataClient,
): Promise<void> {
  if (sessionStorage.getItem(BACKFILL_SESSION_KEY) === "1") return;
  if (!client.models.CartSnapshot) return;

  const snapshots = await listAllCartSnapshots(client);
  const counts = new Map<string, number>();

  for (const snapshot of snapshots) {
    for (const productId of productIdsInCartLines(
      parseSnapshotLineItems(snapshot.lineItems),
    )) {
      counts.set(productId, (counts.get(productId) ?? 0) + 1);
    }
  }

  const products = await listAllProducts(client);
  await Promise.all(
    products.map(async (product) => {
      const next = counts.get(product.id) ?? 0;
      if ((product.activeCartCount ?? 0) === next) return;
      const { errors } = await client.models.Product.update({
        id: product.id,
        activeCartCount: next,
      });
      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join("; "));
      }
    }),
  );

  sessionStorage.setItem(BACKFILL_SESSION_KEY, "1");
}
