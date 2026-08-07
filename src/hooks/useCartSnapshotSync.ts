import { useEffect, useMemo } from "react";
import type { CartLine } from "@/context/CartContext";
import {
  getCustomerDataClient,
  getGuestDataClient,
} from "@/lib/amplifyDataClient";
import { hasCustomerSession } from "@/lib/customerAuth";
import {
  cartLinesReadyForSnapshot,
  syncCartSnapshot,
} from "@/services/cartSnapshotService";
import { ensureGuestSession } from "@/services/guestSessionService";

function cartSyncSignature(items: CartLine[]): string {
  return items
    .map(
      (item) =>
        `${item.productId}:${item.slug}:${item.quantity}:${item.priceCents}`,
    )
    .join("|");
}

/** Keeps server CartSnapshot / GuestCartSnapshot (and product cart counts) in sync. */
export function useCartSnapshotSync(items: CartLine[]) {
  const cartSyncKey = useMemo(() => cartSyncSignature(items), [items]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const signedIn = await hasCustomerSession();

      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client || cancelled) return;

        if (!items.length) {
          const result = await syncCartSnapshot(client, []);
          if (!cancelled && result.error) {
            console.warn(
              "[useCartSnapshotSync] empty-cart sync failed:",
              result.error,
            );
          }
          return;
        }

        if (!cartLinesReadyForSnapshot(items)) return;

        const result = await syncCartSnapshot(client, items);
        if (!cancelled && result.error) {
          console.warn("[useCartSnapshotSync] cart sync failed:", result.error);
        }
        return;
      }

      // Guest path — need HMAC credentials from ensure-guest-session.
      try {
        await ensureGuestSession();
      } catch (err) {
        if (!cancelled) {
          console.warn("[useCartSnapshotSync] guest session failed:", err);
        }
        return;
      }
      if (cancelled) return;

      const client = await getGuestDataClient();
      if (!client || cancelled) return;

      if (!items.length) {
        const result = await syncCartSnapshot(client, [], { asGuest: true });
        if (!cancelled && result.error) {
          console.warn(
            "[useCartSnapshotSync] guest empty-cart sync failed:",
            result.error,
          );
        }
        return;
      }

      if (!cartLinesReadyForSnapshot(items)) return;

      const result = await syncCartSnapshot(client, items, { asGuest: true });
      if (!cancelled && result.error) {
        console.warn(
          "[useCartSnapshotSync] guest cart sync failed:",
          result.error,
        );
      }
    }

    const timer = window.setTimeout(() => {
      void run();
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cartSyncKey, items]);
}
