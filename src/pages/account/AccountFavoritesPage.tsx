import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import {
  getCustomerDataClient,
  getGuestDataClient,
} from "@/lib/amplifyDataClient";
import { getCustomerUserId, hasCustomerSession } from "@/lib/customerAuth";
import { hasFavoriteModel } from "@/lib/dataModels";
import {
  listGuestFavorites,
  listUserFavorites,
  resolveFavoritesAgainstCatalog,
  toggleProductFavorite,
  type ResolvedFavorite,
} from "@/services/favoriteService";
import { ensureGuestSession } from "@/services/guestSessionService";

export function AccountFavoritesPage() {
  const navigate = useNavigate();
  const { products, loading: catalogLoading } = useProducts("all");
  const [signedIn, setSignedIn] = useState(false);
  const [entries, setEntries] = useState<ResolvedFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    const session = await hasCustomerSession();
    setSignedIn(session);

    if (session) {
      const client = await getCustomerDataClient();
      if (!client) {
        navigate(
          `/account/login?returnTo=${encodeURIComponent("/account/favorites")}`,
          { replace: true },
        );
        return null;
      }
      if (!hasFavoriteModel(client)) {
        throw new Error(
          "Favorites are not available yet. Redeploy the Amplify backend.",
        );
      }
      const userId = await getCustomerUserId();
      if (!userId) return null;
      const favorites = await listUserFavorites(client, userId);
      return resolveFavoritesAgainstCatalog(favorites, products);
    }

    await ensureGuestSession();
    const client = await getGuestDataClient();
    if (!client?.queries.listGuestFavorites) {
      throw new Error(
        "Guest favorites are not available yet. Redeploy the Amplify backend.",
      );
    }
    const favorites = await listGuestFavorites(client);
    return resolveFavoritesAgainstCatalog(favorites, products);
  }, [navigate, products]);

  useEffect(() => {
    if (catalogLoading) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const rows = await loadFavorites();
        if (!cancelled && rows) setEntries(rows);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load favorites",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [catalogLoading, loadFavorites]);

  const { active, removed } = useMemo(() => {
    const activeRows = entries.filter((row) => row.status === "active");
    const removedRows = entries.filter((row) => row.status === "removed");
    return { active: activeRows, removed: removedRows };
  }, [entries]);

  async function handleRemove(favorite: ResolvedFavorite) {
    const productId = favorite.favorite.productId;
    setRemovingId(productId);
    try {
      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) return;
        await toggleProductFavorite(
          client,
          productId,
          false,
          favorite.favorite.productSlug ?? undefined,
        );
      } else {
        await ensureGuestSession();
        const client = await getGuestDataClient();
        if (!client) return;
        await toggleProductFavorite(
          client,
          productId,
          false,
          favorite.favorite.productSlug ?? undefined,
          { asGuest: true },
        );
      }
      setEntries((rows) =>
        rows.filter((row) => row.favorite.productId !== productId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove favorite");
    } finally {
      setRemovingId(null);
    }
  }

  if (loading || catalogLoading) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
        <p className="text-on-surface-variant">Loading favorites...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
      <div className="mb-stack-lg flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Saved Favorites
        </h1>
        <Link
          to={signedIn ? "/account" : "/shop"}
          className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
        >
          {signedIn ? "← Account" : "← Shop"}
        </Link>
      </div>

      {!signedIn && (
        <p className="mb-4 text-label-sm text-on-surface-variant">
          Saved on this device.{" "}
          <Link to="/account/login" className="text-primary underline">
            Sign in
          </Link>{" "}
          to keep favorites across devices and unlock offers.
        </p>
      )}

      {error && <p className="mb-4 text-error">{error}</p>}

      {!error && entries.length === 0 && (
        <p className="text-on-surface-variant">
          No saved pieces yet.{" "}
          <Link to="/shop" className="text-primary underline">
            Browse the shop
          </Link>{" "}
          and use <strong className="text-on-surface">Save to favorites</strong>{" "}
          on a product page.
        </p>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="mb-4 font-headline-md uppercase text-on-surface">
            In the store ({active.length})
          </h2>
          <ul className="grid grid-cols-1 gap-stack-lg sm:grid-cols-2 lg:grid-cols-3">
            {active.map((row) => (
              <li key={row.favorite.productId} className="flex flex-col gap-2">
                <ProductCard
                  product={row.product}
                  shopBasePath={row.product.vaultOnly ? "/vault" : "/shop"}
                />
                <button
                  type="button"
                  disabled={removingId === row.favorite.productId}
                  onClick={() => void handleRemove(row)}
                  className="self-start font-label-sm uppercase text-on-surface-variant hover:text-error disabled:opacity-50"
                >
                  {removingId === row.favorite.productId
                    ? "Removing…"
                    : "Remove from favorites"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {removed.length > 0 && (
        <section className={active.length > 0 ? "mt-stack-lg" : undefined}>
          <h2 className="mb-4 font-headline-md uppercase text-on-surface">
            Removed from the store ({removed.length})
          </h2>
          <ul className="space-y-3">
            {removed.map((row) => (
              <li
                key={row.favorite.productId}
                className="flex flex-wrap items-center justify-between gap-4 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
              >
                <div>
                  <p className="font-headline-md text-on-surface">
                    {row.displaySlug}
                  </p>
                  <p className="mt-1 text-label-sm text-on-surface-variant">
                    This piece is no longer available.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={removingId === row.favorite.productId}
                  onClick={() => void handleRemove(row)}
                  className="font-label-sm uppercase text-error hover:underline disabled:opacity-50"
                >
                  {removingId === row.favorite.productId
                    ? "Removing…"
                    : "Remove from favorites"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
