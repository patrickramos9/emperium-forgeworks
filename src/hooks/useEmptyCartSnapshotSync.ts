import { useEffect } from "react";
import type { CartLine } from "@/context/CartContext";
import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import { hasCustomerSession } from "@/lib/customerAuth";
import { syncCartSnapshot } from "@/services/cartSnapshotService";

/** Revokes abandon grants + clears server snapshot when the cart becomes empty (any page). */
export function useEmptyCartSnapshotSync(items: CartLine[]) {
  const isEmpty = items.length === 0;

  useEffect(() => {
    if (!isEmpty) return;

    let cancelled = false;

    async function run() {
      if (!(await hasCustomerSession())) return;
      const client = await getCustomerDataClient();
      if (!client || cancelled) return;
      const result = await syncCartSnapshot(client, []);
      if (cancelled) return;
      if (result.error) {
        console.warn("[useEmptyCartSnapshotSync]", result.error);
      }
    }

    const timer = window.setTimeout(() => {
      void run();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isEmpty]);
}
