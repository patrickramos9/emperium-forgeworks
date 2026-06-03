import { useEffect, useMemo, useState } from "react";
import { MockCheckoutBanner } from "@/components/MockCheckoutBanner";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/seedProducts";
import { productPrimaryImage } from "@/lib/productImageUrls";
import { useProducts } from "@/hooks/useProducts";
import { IS_LOCAL } from "@/lib/config";
import { validateCartLines } from "@/lib/validateCart";
import { useCartPromo } from "@/hooks/useCartPromo";
import { startCheckout } from "@/services/checkoutService";
import { Link } from "react-router-dom";

export function CartPage() {
  const {
    items,
    subtotalCents,
    maxLineQty,
    updateQuantity,
    removeItem,
    clearCart,
    enrichFromCatalog,
  } = useCart();
  const { products, loading: catalogLoading } = useProducts("all");
  const { promo, loading: promoLoading, signedIn } = useCartPromo(items);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discountCents = promo?.discountCents ?? 0;
  const totalAfterPromo = Math.max(0, subtotalCents - discountCents);

  const validationIssues = useMemo(
    () => validateCartLines(items, products),
    [items, products],
  );

  const issuesByKey = useMemo(
    () => new Map(validationIssues.map((issue) => [issue.key, issue.message])),
    [validationIssues],
  );

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  useEffect(() => {
    if (!catalogLoading && products.length > 0) {
      enrichFromCatalog(products);
    }
  }, [catalogLoading, products, enrichFromCatalog]);

  const canCheckout =
    items.length > 0 &&
    !catalogLoading &&
    validationIssues.length === 0 &&
    !checkingOut;

  useEffect(() => {
    if (validationIssues.length > 0 && error) {
      setError(null);
    }
  }, [validationIssues.length, error]);

  async function handleCheckout() {
    setError(null);

    if (catalogLoading) {
      setError("Still loading catalog — try again in a moment.");
      return;
    }

    const issues = validateCartLines(items, products);
    if (issues.length) {
      setError("Fix the items marked below before checkout.");
      return;
    }

    setCheckingOut(true);
    try {
      await startCheckout(items, {
        promoGrantId: promo?.grantId,
      });
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

      {catalogLoading && (
        <p className="mb-4 text-label-sm text-on-surface-variant">
          Verifying catalog…
        </p>
      )}

      <ul className="space-y-4">
        {items.map((item) => {
          const lineTotalCents = item.priceCents * item.quantity;
          const issueMessage = issuesByKey.get(item.key);
          const catalogProduct = productById.get(item.productId);
          const thumbUrl =
            item.imageUrl ??
            (catalogProduct ? productPrimaryImage(catalogProduct) : undefined);

          return (
            <li
              key={item.key}
              className={`flex flex-col gap-4 border bg-surface-container-low p-4 iron-bevel sm:flex-row sm:items-center ${
                issueMessage
                  ? "border-error/50"
                  : "border-outline-variant/20"
              }`}
            >
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt=""
                  className="h-24 w-24 shrink-0 object-cover"
                />
              ) : (
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center border border-outline-variant/20 bg-surface-container text-center text-label-sm text-on-surface-variant"
                  aria-hidden
                >
                  —
                </div>
              )}
              <div className="min-w-0 flex-grow">
                <Link
                  to={`/shop/${item.slug}`}
                  className="font-headline-md text-on-surface hover:text-primary"
                >
                  {item.title}
                </Link>
                {item.variantLabel && (
                  <p className="text-label-sm text-on-surface-variant">
                    {item.variantLabel}
                  </p>
                )}
                <p className="font-label-md text-primary">
                  {formatPrice(item.priceCents)} each
                </p>
                {issueMessage && (
                  <p className="mt-1 text-label-sm text-error">{issueMessage}</p>
                )}
              </div>
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
              <div className="text-right sm:min-w-[6rem]">
                <p className="font-label-md text-on-surface">
                  {formatPrice(lineTotalCents)}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="mt-1 text-label-sm text-on-surface-variant hover:text-error"
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
                  Subtotal {formatPrice(subtotalCents)}
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
                Subtotal: {formatPrice(subtotalCents)}
              </p>
              <p className="font-label-md text-xl text-primary">
                Total before shipping: {formatPrice(subtotalCents)}
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
