import type { CartLine } from "@/context/CartContext";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";

export function cartLinesToSnapshotInput(items: CartLine[]) {
  return items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    quantity: item.quantity,
    priceCents: item.priceCents,
    title: item.title,
  }));
}

export async function syncCartSnapshot(
  client: AmplifyDataClient,
  items: CartLine[],
): Promise<{ synced: boolean; grantIssued: boolean }> {
  if (!client.mutations.syncCartSnapshot) {
    return { synced: false, grantIssued: false };
  }
  const { data, errors } = await client.mutations.syncCartSnapshot({
    lineItems: cartLinesToSnapshotInput(items),
  });
  if (errors?.length) {
    console.warn("[syncCartSnapshot]", errors.map((e) => e.message).join("; "));
    return { synced: false, grantIssued: false };
  }
  return data ?? { synced: false, grantIssued: false };
}
