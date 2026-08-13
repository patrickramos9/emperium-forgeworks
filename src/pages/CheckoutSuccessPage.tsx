import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import { hasCustomerSession } from "@/lib/customerAuth";

export function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const { clearCart } = useCart();
  const isMock = params.get("mock") === "1";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    void hasCustomerSession().then(setSignedIn);
  }, []);

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 text-center md:px-margin-desktop mx-auto max-w-container-max">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Order Forged
      </h1>
      <p className="mt-4 text-on-surface-variant">
        {isMock
          ? "Mock checkout completed successfully. No payment was processed."
          : "Thank you. Your payment was received."}
      </p>
      {params.get("session") && (
        <p className="mt-2 font-label-sm text-on-surface-variant">
          Reference: {params.get("session")}
        </p>
      )}

      {signedIn === false && (
        <div className="mt-8 border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
          <p className="text-on-surface-variant">
            View or cancel this order from Orders on this device, or create a
            free account to track purchases across devices.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              to="/account/orders"
              className="molten-glow inline-block border border-primary/40 bg-surface-container px-6 py-3 font-label-md uppercase text-primary"
            >
              View orders
            </Link>
            <Link
              to="/account/register"
              className="inline-block border border-outline-variant/30 px-6 py-3 font-label-md uppercase text-on-surface-variant hover:text-primary"
            >
              Create account
            </Link>
          </div>
        </div>
      )}

      {signedIn === true && (
        <Link
          to="/account/orders"
          className="mt-6 inline-block font-label-sm uppercase text-primary underline"
        >
          View order history
        </Link>
      )}

      <Link
        to="/shop"
        className="molten-glow mt-8 inline-block bg-primary px-6 py-3 font-label-md uppercase text-on-primary"
      >
        Return to the Lair
      </Link>
    </main>
  );
}
