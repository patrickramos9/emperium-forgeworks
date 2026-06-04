import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import { getCustomerUserId, hasCustomerSession } from "@/lib/customerAuth";
import { hasFavoriteModel } from "@/lib/dataModels";
import { useProducts } from "@/hooks/useProducts";
import {
  findStaleFavoriteForSlug,
  toggleProductFavorite,
} from "@/services/favoriteService";

type Props = {
  slug: string | undefined;
  listPath?: string;
  listLabel?: string;
};

/** Shown when PDP slug has no product but user still has a favorite for it. */
export function StaleFavoriteNotice({
  slug,
  listPath = "/shop",
  listLabel = "Shop",
}: Props) {
  const { products, loading: catalogLoading } = useProducts("all");
  const catalogIds = useMemo(
    () => new Set(products.map((p) => p.id)),
    [products],
  );

  const [loading, setLoading] = useState(true);
  const [staleProductId, setStaleProductId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug || catalogLoading) return;

      const session = await hasCustomerSession();
      if (!session) {
        if (!cancelled) setLoading(false);
        return;
      }
      const client = await getCustomerDataClient();
      const userId = await getCustomerUserId();
      if (!client || !userId || !hasFavoriteModel(client)) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const row = await findStaleFavoriteForSlug(
          client,
          userId,
          slug,
          catalogIds,
        );
        if (!cancelled) setStaleProductId(row?.productId ?? null);
      } catch (err) {
        console.warn("[StaleFavoriteNotice]", err);
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, catalogLoading, catalogIds]);

  if (loading || catalogLoading || !staleProductId || cleared || !slug) {
    return null;
  }

  return (
    <div className="mt-6 max-w-lg border border-outline-variant/30 bg-surface-container-low p-4 iron-bevel">
      <p className="font-headline-md text-on-surface">
        Removed from the store
      </p>
      <p className="mt-2 text-body-sm text-on-surface-variant">
        You had this piece saved to your favorites, but it is no longer available.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void (async () => {
            const client = await getCustomerDataClient();
            if (!client) return;
            setBusy(true);
            try {
              await toggleProductFavorite(client, staleProductId, false, slug);
              setCleared(true);
            } catch (err) {
              console.warn("[StaleFavoriteNotice] remove failed", err);
            } finally {
              setBusy(false);
            }
          })();
        }}
        className="mt-4 font-label-sm uppercase text-error hover:underline disabled:opacity-50"
      >
        {busy ? "Removing…" : "Remove from favorites"}
      </button>
      <p className="mt-4 text-label-sm">
        <Link to={listPath} className="text-primary hover:underline">
          Back to {listLabel.toLowerCase()}
        </Link>
      </p>
    </div>
  );
}
