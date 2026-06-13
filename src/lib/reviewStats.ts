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
