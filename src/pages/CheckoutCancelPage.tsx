import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { configureAmplify } from "@/lib/amplify";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { PageFeedback } from "@/components/PageFeedback";

export function CheckoutCancelPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";
  const [syncing, setSyncing] = useState(Boolean(sessionId));
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function syncCancelledOrder() {
      const configured = await configureAmplify();
      if (!configured) {
        if (!cancelled) {
          setSyncError("Checkout status could not be synced.");
          setSyncing(false);
        }
        return;
      }

      const client = await getGuestDataClient();
      if (!client?.mutations.cancelStripeCheckoutSession) {
        if (!cancelled) {
          setSyncError("Checkout cancel sync is not deployed yet.");
          setSyncing(false);
        }
        return;
      }

      try {
        const { errors } = await client.mutations.cancelStripeCheckoutSession({
          checkoutSessionId: sessionId,
        });
        if (errors?.length) {
          throw new Error(errors.map((e) => e.message).join("; "));
        }
      } catch (err) {
        if (!cancelled) {
          setSyncError(
            err instanceof Error ? err.message : "Could not sync order status.",
          );
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    void syncCancelledOrder();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 text-center md:px-margin-desktop mx-auto max-w-container-max">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Checkout Cancelled
      </h1>
      <p className="mt-4 text-on-surface-variant">
        Your cart is unchanged. Return when you are ready to forge.
      </p>
      {syncing && (
        <PageFeedback tone="info" className="mx-auto mt-3 max-w-md text-center">
          Updating order status…
        </PageFeedback>
      )}
      {syncError && (
        <PageFeedback tone="error" className="mx-auto mt-3 max-w-md text-center">
          {syncError}
        </PageFeedback>
      )}
      <Link to="/cart" className="mt-8 inline-block text-primary underline">
        Back to cart
      </Link>
    </main>
  );
}
