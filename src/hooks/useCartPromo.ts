import { useEffect, useState } from "react";
import type { CartLine } from "@/context/CartContext";
import type { Product } from "@/data/seedProducts";
import { filterPurchasableCartLines } from "@/lib/cartCatalog";
import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import { hasPromoGrantModel } from "@/lib/dataModels";
import { hasCustomerSession } from "@/lib/customerAuth";
import { getCustomerUserId } from "@/lib/customerAuth";
import type { AppliedPromo } from "@/lib/promoGrants";
import { resolveBestAppliedPromo } from "@/services/promoGrantService";

export function useCartPromo(lines: CartLine[], products: Product[]) {
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const lineKey = lines
    .map((l) => `${l.productId}:${l.quantity}:${l.priceCents}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const session = await hasCustomerSession();
      if (!cancelled) setSignedIn(session);

      const purchasable = filterPurchasableCartLines(lines, products);

      if (!session || !purchasable.length) {
        if (!cancelled) {
          setPromo(null);
          setLoading(false);
        }
        return;
      }

      const client = await getCustomerDataClient();
      if (!client || !hasPromoGrantModel(client)) {
        if (client && !hasPromoGrantModel(client)) {
          console.warn(
            "[useCartPromo] PromoGrant model missing — redeploy Amplify backend and refresh the site.",
          );
        }
        if (!cancelled) {
          setPromo(null);
          setLoading(false);
        }
        return;
      }

      const userId = await getCustomerUserId();
      if (!userId) {
        if (!cancelled) {
          setPromo(null);
          setLoading(false);
        }
        return;
      }

      try {
        const applied = await resolveBestAppliedPromo(
          client,
          userId,
          purchasable.map((line) => ({
            productId: line.productId,
            priceCents: line.priceCents,
            quantity: line.quantity,
          })),
        );
        if (!cancelled) setPromo(applied);
      } catch (err) {
        console.error("[useCartPromo]", err);
        if (!cancelled) setPromo(null);
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [lineKey, signedIn, products]);

  return { promo, loading, signedIn };
}
