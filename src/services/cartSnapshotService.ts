import type { CartLine } from "@/context/CartContext";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { getStoredGuestSession } from "@/services/guestSessionService";

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

export type SyncCartSnapshotResult = {
  synced: boolean;
  grantIssued: boolean;
  grantsRevoked?: boolean;
  error?: string;
};

export async function syncCartSnapshot(
  client: AmplifyDataClient,
  items: CartLine[],
  options?: { asGuest?: boolean },
): Promise<SyncCartSnapshotResult> {
  if (!client.mutations.syncCartSnapshot) {
    return {
      synced: false,
      grantIssued: false,
      error: "Cart sync is not available — redeploy the Amplify backend.",
    };
  }

  const lineItems = cartLinesToSnapshotInput(items);
  const args: {
    lineItems: ReturnType<typeof cartLinesToSnapshotInput>;
    guestId?: string;
    guestToken?: string;
  } = { lineItems };

  if (options?.asGuest) {
    const session = getStoredGuestSession();
    if (!session) {
      return {
        synced: false,
        grantIssued: false,
        error: "Guest session not ready — reload and try again.",
      };
    }
    args.guestId = session.guestId;
    args.guestToken = session.guestToken;
  }

  const { data, errors } = await client.mutations.syncCartSnapshot(args);
  if (errors?.length) {
    const message = errors.map((e) => e.message).join("; ");
    console.warn("[syncCartSnapshot]", message);
    return { synced: false, grantIssued: false, error: message };
  }
  return data ?? { synced: false, grantIssued: false };
}
