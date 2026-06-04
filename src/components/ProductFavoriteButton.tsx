import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import { getCustomerUserId, hasCustomerSession } from "@/lib/customerAuth";
import { hasFavoriteModel } from "@/lib/dataModels";
import {
  isProductFavorited,
  toggleProductFavorite,
} from "@/services/favoriteService";

type Props = {
  productId: string;
  productSlug: string;
  /** When false, product was delisted — show removed state only. */
  productInCatalog?: boolean;
  className?: string;
};

export function ProductFavoriteButton({
  productId,
  productSlug,
  productInCatalog = true,
  className = "",
}: Props) {
  const [signedIn, setSignedIn] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const session = await hasCustomerSession();
      if (!cancelled) setSignedIn(session);
      if (!session) {
        if (!cancelled) {
          setFavorited(false);
          setLoading(false);
        }
        return;
      }

      const client = await getCustomerDataClient();
      const userId = await getCustomerUserId();
      if (!client || !userId || !hasFavoriteModel(client)) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const saved = await isProductFavorited(client, userId, productId);
        if (!cancelled) setFavorited(saved);
      } catch (err) {
        console.warn("[ProductFavoriteButton]", err);
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleToggle = useCallback(async () => {
    setMessage(null);
    const client = await getCustomerDataClient();
    if (!client) return;

    setBusy(true);
    try {
      const next = !favorited;
      const result = await toggleProductFavorite(
        client,
        productId,
        next,
        productSlug,
      );
      setFavorited(result.favorited);
      if (result.favorited && result.grantIssued) {
        setMessage(
          "Offer added — check Account → Notifications and your cart when this item is in the cart.",
        );
      } else if (result.favorited) {
        setMessage(
          "Saved to favorites. If you already have an offer for this item, it stays in Account → Notifications.",
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update favorite");
    } finally {
      setBusy(false);
    }
  }, [favorited, productId, productSlug]);

  if (!productInCatalog) {
    return (
      <p className={`text-label-sm text-on-surface-variant ${className}`}>
        This item was removed from the store.
        {favorited && (
          <>
            {" "}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleToggle()}
              className="text-error hover:underline disabled:opacity-50"
            >
              Remove from favorites
            </button>
          </>
        )}
      </p>
    );
  }

  if (!signedIn) {
    return (
      <p className={`text-label-sm text-on-surface-variant ${className}`}>
        <Link to="/account/login" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        to save favorites and unlock offers.
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={loading || busy}
        onClick={() => void handleToggle()}
        className="inline-flex items-center gap-2 border border-outline-variant/30 px-4 py-2 font-label-sm uppercase tracking-widest text-on-surface hover:border-primary disabled:opacity-50"
        aria-pressed={favorited}
      >
        <Icon
          name={favorited ? "favorite" : "favorite_border"}
          className={favorited ? "text-primary" : "text-on-surface-variant"}
        />
        {favorited ? "Saved" : "Save to favorites"}
      </button>
      {message && (
        <p className="mt-2 text-label-sm text-secondary">{message}</p>
      )}
    </div>
  );
}
