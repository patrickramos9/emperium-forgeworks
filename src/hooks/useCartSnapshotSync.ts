import { useEffect, useMemo } from "react";
import type { CartLine } from "@/context/CartContext";
import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import { hasCustomerSession } from "@/lib/customerAuth";
import {
  cartLinesReadyForSnapshot,
  syncCartSnapshot,
} from "@/services/cartSnapshotService";

function cartSyncSignature(items: CartLine[]): string {
  return items
    .map(
      (item) =>
        `${item.productId}:${item.slug}:${item.quantity}:${item.priceCents}`,
    )
    .join("|");
}

/** Keeps server CartSnapshot (and product cart counts) in sync for signed-in shoppers. */
export function useCartSnapshotSync(items: CartLine[]) {
  const cartSyncKey = useMemo(() => cartSyncSignature(items), [items]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!(await hasCustomerSession())) return;
      const client = await getCustomerDataClient();
      if (!client || cancelled) return;

      if (!items.length) {
        const result = await syncCartSnapshot(client, []);
        if (!cancelled && result.error) {
          console.warn("[useCartSnapshotSync] empty-cart sync failed:", result.error);
        }
        return;
      }

      if (!cartLinesReadyForSnapshot(items)) return;

      const result = await syncCartSnapshot(client, items);
      if (!cancelled && result.error) {
        console.warn("[useCartSnapshotSync] cart sync failed:", result.error);
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
