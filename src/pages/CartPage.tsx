import { useEffect, useMemo, useState } from "react";
import { MockCheckoutBanner } from "@/components/MockCheckoutBanner";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/seedProducts";
import { CartLineThumbnail } from "@/components/CartLineThumbnail";
import { findCatalogProduct } from "@/lib/cartLineImage";
import { useProducts } from "@/hooks/useProducts";
import { IS_LOCAL } from "@/lib/config";
import {
  cartSubtotalCents,
  filterPurchasableCartLines,
  getCartLineIssues,
  isCartCatalogVerified,
  issuesByLineKey,
} from "@/lib/cartCatalog";
import { useCartPromo } from "@/hooks/useCartPromo";
import { startCheckout } from "@/services/checkoutService";
import { syncCartSnapshot, cartLinesReadyForSnapshot } from "@/services/cartSnapshotService";
import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import { Link } from "react-router-dom";

export function CartPage() {
  const {
    items,
    maxLineQty,
    updateQuantity,
    removeItem,
    clearCart,
    enrichFromCatalog,
  } = useCart();
  const { products, loading: catalogLoading, loadError } = useProducts("all");
  const [promoRefreshKey, setPromoRefreshKey] = useState(0);
  const [preferAbandonedPromo, setPreferAbandonedPromo] = useState(false);
  const catalogVerified = isCartCatalogVerified(
    items,
    products,
    catalogLoading,
  );
  const { promo, loading: promoLoading, signedIn } = useCartPromo(
    items,
    products,
    promoRefreshKey,
    catalogVerified,
    preferAbandonedPromo ? "abandoned_cart" : undefined,
  );
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const cartIssues = useMemo(
    () => getCartLineIssues(items, products, catalogVerified),
    [items, products, catalogVerified],
  );

  const issueByKey = useMemo(() => issuesByLineKey(cartIssues), [cartIssues]);

  const purchasableItems = useMemo(
    () => filterPurchasableCartLines(items, products, catalogVerified),
    [items, products, catalogVerified],
  );

  const purchasableSubtotalCents = useMemo(
    () => cartSubtotalCents(purchasableItems),
    [purchasableItems],
  );

  const hasRemovedLines = cartIssues.some((issue) => issue.kind === "removed");
  const discountCents = promo?.discountCents ?? 0;
  const totalAfterPromo = Math.max(0, purchasableSubtotalCents - discountCents);

  const blockingIssues = cartIssues.filter((issue) => issue.blocksCheckout);

  useEffect(() => {
    if (!catalogLoading && products.length > 0) {
      enrichFromCatalog(products);
    }
  }, [catalogLoading, products, enrichFromCatalog]);

  const cartSyncKey = items
    .map((i) => `${i.key}:${i.quantity}:${i.priceCents}`)
    .join("|");

  useEffect(() => {
    if (!catalogVerified) return;
    setPromoRefreshKey((key) => key + 1);
  }, [catalogVerified]);

  useEffect(() => {
    if (!signedIn || !items.length || catalogLoading || !catalogVerified) return;
    if (!cartLinesReadyForSnapshot(items)) return;

    let cancelled = false;

    async function runSync() {
      const client = await getCustomerDataClient();
      if (!client || cancelled) return;
      const result = await syncCartSnapshot(client, items);
      if (cancelled) return;
      setPromoRefreshKey((key) => key + 1);
      if (result.error) {
        setSyncNotice(null);
        console.warn("[CartPage] cart sync failed:", result.error);
        return;
      }
      if (result.grantIssued) {
        setPreferAbandonedPromo(true);
        setSyncNotice("Welcome-back offer applied to your cart.");
      }
    }

    const timer = window.setTimeout(() => {
      void runSync();
    }, 600);

    const interval = window.setInterval(() => {
      void runSync();
    }, 5 * 60 * 1000);

    function onVisible() {
      if (document.visibilityState === "visible") {
        void runSync();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [cartSyncKey, signedIn, items, catalogLoading, catalogVerified]);

  const canCheckout =
    purchasableItems.length > 0 &&
    catalogVerified &&
    !catalogLoading &&
    blockingIssues.length === 0 &&
    !checkingOut;

  useEffect(() => {
    if (blockingIssues.length > 0 && error) {
      setError(null);
    }
  }, [blockingIssues.length, error]);

  async function handleCheckout() {
    setError(null);

    if (catalogLoading) {
      setError("Still loading catalog — try again in a moment.");
      return;
    }

    const issues = getCartLineIssues(items, products, catalogVerified);
    if (issues.some((issue) => issue.blocksCheckout)) {
      setError("Remove or fix the items marked below before checkout.");
      return;
    }

    if (!purchasableItems.length) {
      setError("No available items to checkout.");
      return;
    }

    setCheckingOut(true);
    try {
      await startCheckout(purchasableItems, {
        promoGrantId: promo?.grantId,
      }, products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setCheckingOut(false);
    }
  }

  if (!items.length) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
        <MockCheckoutBanner />
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Your Cart
        </h1>
        <p className="mt-4 text-on-surface-variant">The vault is empty.</p>
        <Link
          to="/shop"
          className="molten-glow mt-6 inline-block bg-primary px-6 py-3 font-label-md uppercase text-on-primary"
        >
          Browse the shop
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
      <MockCheckoutBanner />
      <h1 className="mb-stack-lg font-display-lg text-headline-lg uppercase text-primary">
        Your Cart
      </h1>

      {(catalogLoading || (!catalogVerified && products.length > 0)) && (
        <p className="mb-4 text-label-sm text-on-surface-variant">
          Verifying cart against catalog…
        </p>
      )}

      {loadError && !catalogLoading && products.length === 0 && (
        <p className="mb-4 text-label-sm text-error">
          Could not load catalog — refresh the page to verify cart items.
        </p>
      )}

      {syncNotice && (
        <p className="mb-4 border border-secondary/30 bg-surface-container-low p-3 text-body-sm text-secondary">
          {syncNotice}
        </p>
      )}

      {hasRemovedLines && !catalogLoading && (
        <p
          className="mb-4 border border-error/30 bg-surface-container-low p-3 text-body-sm text-on-surface"
          role="status"
        >
          Some items in your cart were removed from the store. Remove them below
          to continue.
        </p>
      )}

      <ul className="space-y-4">
        {items.map((item) => {
          const lineTotalCents = item.priceCents * item.quantity;
          const issue = issueByKey.get(item.key);
          const catalogProduct = findCatalogProduct(item, products);
          const isRemoved = issue?.kind === "removed";
          const lineBlocked = issue?.blocksCheckout ?? false;

          return (
            <li
              key={item.key}
              className={`flex flex-col gap-4 border bg-surface-container-low p-4 iron-bevel sm:flex-row sm:items-center ${
                lineBlocked
                  ? "border-error/50 opacity-90"
                  : "border-outline-variant/20"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-4 sm:flex-1">
                <CartLineThumbnail
                  item={item}
                  product={catalogProduct}
                  catalogLoading={catalogLoading}
                />
                <div className="min-w-0 flex-1">
                {isRemoved ? (
                  <p className="font-headline-md text-on-surface">{item.title}</p>
                ) : (
                  <Link
                    to={`/shop/${item.slug}`}
                    className="font-headline-md text-on-surface hover:text-primary"
                  >
                    {item.title}
                  </Link>
                )}
                {item.variantLabel && (
                  <p className="text-label-sm text-on-surface-variant">
                    {item.variantLabel}
                  </p>
                )}
                {!isRemoved && (
                  <p className="font-label-md text-primary">
                    {formatPrice(item.priceCents)} each
                  </p>
                )}
                {issue && (
                  <p className="mt-1 text-label-sm text-error">{issue.message}</p>
                )}
                </div>
              </div>
              {!lineBlocked ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    className="border border-outline-variant/30 px-3 py-1 hover:border-primary"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-label-md">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={item.quantity >= maxLineQty}
                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    className="border border-outline-variant/30 px-3 py-1 hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="sm:min-w-[6rem]" />
              )}
              <div className="text-right sm:min-w-[6rem]">
                {!isRemoved && (
                  <p className="font-label-md text-on-surface">
                    {formatPrice(lineTotalCents)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className={`font-label-sm uppercase hover:text-error ${
                    lineBlocked
                      ? "mt-0 bg-error/10 px-3 py-2 text-error"
                      : "mt-1 text-on-surface-variant"
                  }`}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-stack-lg border-t border-outline-variant/20 pt-stack-lg">
        <div className="space-y-2 text-right">
          {promoLoading && signedIn && (
            <p className="text-label-sm text-on-surface-variant">
              Checking offers…
            </p>
          )}
          {discountCents > 0 && promo ? (
            <>
              <p className="font-label-md text-on-surface-variant">
                <span className="line-through">
                  Subtotal {formatPrice(purchasableSubtotalCents)}
                </span>
              </p>
              <p className="text-label-sm text-secondary">
                {promo.label} (expires {promo.expiresLabel}) −
                {formatPrice(discountCents)}
              </p>
              <p className="font-label-md text-xl text-primary">
                Total before shipping: {formatPrice(totalAfterPromo)}
              </p>
            </>
          ) : (
            <>
              <p className="font-label-md text-on-surface">
                Subtotal: {formatPrice(purchasableSubtotalCents)}
              </p>
              <p className="font-label-md text-xl text-primary">
                Total before shipping: {formatPrice(purchasableSubtotalCents)}
              </p>
            </>
          )}
        </div>
        {!signedIn && (
          <p className="mt-2 text-right text-label-sm text-on-surface-variant">
            <Link to="/account/login" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            for promotional offers.
          </p>
        )}
        <p className="mt-1 text-right text-label-sm text-on-surface-variant">
          {IS_LOCAL
            ? "Mock checkout locally — no charge."
            : "Secure checkout via Stripe (cards, Apple Pay, Google Pay). Shipping at checkout."}
        </p>
        {error && <p className="mt-2 text-right text-error">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-4">
          <button
            type="button"
            onClick={clearCart}
            className="border border-outline-variant/30 px-4 py-2 font-label-md uppercase text-on-surface-variant"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={!canCheckout}
            onClick={() => void handleCheckout()}
            className="molten-glow bg-primary px-6 py-3 font-label-md uppercase tracking-widest text-on-primary disabled:opacity-50"
          >
            {checkingOut ? "Forging..." : "Checkout"}
          </button>
        </div>
      </div>
    </main>
  );
}
