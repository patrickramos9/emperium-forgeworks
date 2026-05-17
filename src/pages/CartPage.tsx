import { useState } from "react";
import { Link } from "react-router-dom";
import { MockCheckoutBanner } from "@/components/MockCheckoutBanner";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/seedProducts";
import { startCheckout } from "@/services/checkoutService";

export function CartPage() {
  const { items, subtotalCents, updateQuantity, removeItem, clearCart } =
    useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    setCheckingOut(true);
    try {
      await startCheckout(items);
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
          className="mt-6 inline-block text-primary underline"
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

      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-col gap-4 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel sm:flex-row sm:items-center"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="h-24 w-24 object-cover"
              />
            )}
            <div className="flex-grow">
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
                {formatPrice(item.priceCents)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(item.key, item.quantity - 1)}
                className="border border-outline-variant/30 px-3 py-1"
              >
                −
              </button>
              <span className="w-8 text-center font-label-md">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(item.key, item.quantity + 1)}
                className="border border-outline-variant/30 px-3 py-1"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.key)}
              className="text-label-sm text-on-surface-variant hover:text-error"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-stack-lg border-t border-outline-variant/20 pt-stack-lg">
        <p className="text-right font-label-md text-xl text-primary">
          Subtotal: {formatPrice(subtotalCents)}
        </p>
        {error && (
          <p className="mt-2 text-right text-error">{error}</p>
        )}
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
            disabled={checkingOut}
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
