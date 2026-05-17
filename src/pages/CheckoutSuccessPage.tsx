import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useEffect } from "react";

export function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const { clearCart } = useCart();
  const isMock = params.get("mock") === "1";

  useEffect(() => {
    clearCart();
  }, [clearCart]);

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
      <Link
        to="/shop"
        className="molten-glow mt-8 inline-block bg-primary px-6 py-3 font-label-md uppercase text-on-primary"
      >
        Return to the Vault
      </Link>
    </main>
  );
}
