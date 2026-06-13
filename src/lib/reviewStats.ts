import type { ReviewRecord } from "@/services/reviewService";

export function computeAverageReviewRating(
  reviews: ReviewRecord[],
): number | null {
  if (!reviews.length) return null;

  const sum = reviews.reduce(
    (total, review) =>
      total + Math.min(5, Math.max(1, review.rating ?? 5)),
    0,
  );

  return sum / reviews.length;
}

export function formatQualityIndex(rating: number | null): string {
  if (rating === null) return "—";
  return rating.toFixed(1);
}

export function clampStarRating(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export function resolveProductStarRating(
  approvedReviews: ReviewRecord[],
  displayRating?: number | null,
): {
  rating: number | null;
  reviewCount: number;
  fromReviews: boolean;
} {
  if (approvedReviews.length > 0) {
    return {
      rating: computeAverageReviewRating(approvedReviews),
      reviewCount: approvedReviews.length,
      fromReviews: true,
    };
  }

  const adminRating = clampStarRating(displayRating);
  if (adminRating != null) {
    return { rating: adminRating, reviewCount: 0, fromReviews: false };
  }

  return { rating: null, reviewCount: 0, fromReviews: false };
}
