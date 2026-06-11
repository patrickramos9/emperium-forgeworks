import type { CartLine } from "@/context/CartContext";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";

export function cartLinesToSnapshotInput(items: CartLine[]) {
  return items
    .filter((item) => item.quantity > 0 && item.productId)
    .map((item) => ({
      productId: item.productId,
      slug: item.slug?.trim() || item.productId,
      quantity: Math.round(item.quantity),
      priceCents: Math.round(item.priceCents),
      ...(item.title?.trim() ? { title: item.title.trim() } : {}),
    }));
}

export function cartLinesReadyForSnapshot(items: CartLine[]): boolean {
  return (
    items.length > 0 &&
    items.every(
      (item) =>
        item.quantity > 0 &&
        Boolean(item.productId) &&
        Boolean(item.slug?.trim() || item.productId),
    )
  );
}

export async function syncCartSnapshot(
  client: AmplifyDataClient,
  items: CartLine[],
): Promise<{ synced: boolean; grantIssued: boolean; error?: string }> {
  if (!client.mutations.syncCartSnapshot) {
    return {
      synced: false,
      grantIssued: false,
      error: "Cart sync is not available — redeploy the Amplify backend.",
    };
  }

  const lineItems = cartLinesToSnapshotInput(items);
  if (!lineItems.length) {
    return { synced: false, grantIssued: false };
  }

  const { data, errors } = await client.mutations.syncCartSnapshot({
    lineItems,
  });
  if (errors?.length) {
    const message = errors.map((e) => e.message).join("; ");
    console.warn("[syncCartSnapshot]", message);
    return { synced: false, grantIssued: false, error: message };
  }
  return data ?? { synced: false, grantIssued: false };
}
