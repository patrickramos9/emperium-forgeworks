import { Icon } from "@/components/Icon";
import { formatQualityIndex } from "@/lib/reviewStats";

type ProductStarRatingProps = {
  rating: number;
  reviewCount?: number;
  className?: string;
};

export function ProductStarRating({
  rating,
  reviewCount = 0,
  className = "",
}: ProductStarRatingProps) {
  const clamped = Math.min(5, Math.max(1, rating));
  const filledStars = Math.round(clamped);

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div className="flex text-plasma-glow">
        {Array.from({ length: 5 }).map((_, index) => (
          <Icon
            key={index}
            name="star"
            className="text-sm"
            filled={index < filledStars}
          />
        ))}
      </div>
      <span className="font-label-sm text-on-surface-variant">
        {formatQualityIndex(clamped)}
        {reviewCount > 0 ? ` (${reviewCount})` : ""}
      </span>
    </div>
  );
}
