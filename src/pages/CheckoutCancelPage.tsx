import { Link } from "react-router-dom";

export function CheckoutCancelPage() {
  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 text-center md:px-margin-desktop mx-auto max-w-container-max">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Checkout Cancelled
      </h1>
      <p className="mt-4 text-on-surface-variant">
        Your cart is unchanged. Return when you are ready to forge.
      </p>
      <Link to="/cart" className="mt-8 inline-block text-primary underline">
        Back to cart
      </Link>
    </main>
  );
}
