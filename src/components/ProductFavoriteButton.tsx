import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/context/ToastContext";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import {
  getCustomerDataClient,
  getGuestDataClient,
} from "@/lib/amplifyDataClient";
import { getCustomerUserId, hasCustomerSession } from "@/lib/customerAuth";
import { hasFavoriteModel } from "@/lib/dataModels";
import {
  isGuestProductFavorited,
  isProductFavorited,
  toggleProductFavorite,
} from "@/services/favoriteService";
import { ensureGuestSession } from "@/services/guestSessionService";

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
  const { showToast } = useToast();
  const { refreshNotificationBadge } = useNotificationBadge();
  const [signedIn, setSignedIn] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const session = await hasCustomerSession();
      if (!cancelled) setSignedIn(session);

      try {
        if (session) {
          const client = await getCustomerDataClient();
          const userId = await getCustomerUserId();
          if (!client || !userId || !hasFavoriteModel(client)) {
            if (!cancelled) setLoading(false);
            return;
          }
          const saved = await isProductFavorited(client, userId, productId);
          if (!cancelled) setFavorited(saved);
        } else {
          await ensureGuestSession();
          const client = await getGuestDataClient();
          if (!client?.queries.listGuestFavorites) {
            if (!cancelled) {
              setFavorited(false);
              setLoading(false);
            }
            return;
          }
          const saved = await isGuestProductFavorited(client, productId);
          if (!cancelled) setFavorited(saved);
        }
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
    setBusy(true);
    try {
      const next = !favorited;
      let result: { favorited: boolean; grantIssued: boolean };

      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) return;
        result = await toggleProductFavorite(
          client,
          productId,
          next,
          productSlug,
        );
      } else {
        await ensureGuestSession();
        const client = await getGuestDataClient();
        if (!client) return;
        result = await toggleProductFavorite(
          client,
          productId,
          next,
          productSlug,
          { asGuest: true },
        );
      }

      setFavorited(result.favorited);

      if (result.favorited) {
        if (result.grantIssued) {
          refreshNotificationBadge();
          showToast({
            tone: "success",
            title: "Saved to favorites",
            description:
              "A promo offer was added — check Notifications when this item is in your cart.",
            action: {
              label: "View notifications",
              href: "/account/notifications",
            },
          });
        } else if (signedIn) {
          showToast({
            tone: "success",
            title: "Saved to favorites",
            action: { label: "View favorites", href: "/account/favorites" },
          });
        } else {
          showToast({
            tone: "success",
            title: "Saved to favorites",
            description: "Sign in anytime to unlock favorite offers.",
            action: { label: "View favorites", href: "/account/favorites" },
          });
        }
      } else {
        showToast({
          tone: "success",
          title: "Removed from favorites",
        });
      }
    } catch (err) {
      showToast({
        tone: "error",
        title: "Could not update favorite",
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  }, [
    favorited,
    productId,
    productSlug,
    refreshNotificationBadge,
    showToast,
    signedIn,
  ]);

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
    </div>
  );
}
