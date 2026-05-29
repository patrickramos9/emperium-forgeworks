import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ReviewCard } from "@/components/ReviewCard";
import { useSiteLayout } from "@/context/AnnouncementContext";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasReviewModel } from "@/lib/dataModels";
import {
  listApprovedReviews,
  type ReviewRecord,
} from "@/services/reviewService";

export function ReviewsPage() {
  const { mainTopPadding } = useSiteLayout();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const client = await getGuestDataClient();
      if (!client || !hasReviewModel(client)) {
        setLoading(false);
        return;
      }
      try {
        setReviews(await listApprovedReviews(client, 100));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load reviews");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main
      className={`mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop ${mainTopPadding}`}
    >
      <div className="mb-stack-lg flex flex-wrap items-end justify-between gap-4 border-b-2 border-primary pb-2">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase tracking-tighter text-on-surface">
            Voices From The Void
          </h1>
          <p className="mt-2 font-body-md text-on-surface-variant">
            Real reviews from customers who summoned darkness from the forge.
          </p>
        </div>
        <Link
          to="/shop"
          className="font-label-md uppercase tracking-widest text-primary hover:text-plasma-glow"
        >
          Enter the Lair
        </Link>
      </div>

      {loading && (
        <p className="text-on-surface-variant">Loading reviews...</p>
      )}

      {error && <p className="text-error">{error}</p>}

      {!loading && !error && reviews.length === 0 && (
        <p className="text-on-surface-variant">
          No approved reviews yet. Be the first to leave your mark after a
          purchase.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-gutter md:grid-cols-2">
        {reviews.map((review) => (
          <li key={review.orderId}>
            <ReviewCard review={review} />
          </li>
        ))}
      </ul>
    </main>
  );
}
