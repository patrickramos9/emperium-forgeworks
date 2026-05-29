import { Icon } from "@/components/Icon";
import {
  reviewDisplayName,
  type ReviewRecord,
} from "@/services/reviewService";

type ReviewCardProps = {
  review: ReviewRecord;
  compact?: boolean;
};

export function ReviewCard({ review, compact = false }: ReviewCardProps) {
  const rating = Math.min(5, Math.max(1, review.rating ?? 5));

  return (
    <blockquote
      className="border border-outline-variant/10 bg-surface-container-low p-stack-lg iron-bevel"
    >
      <div className="mb-3 flex gap-0.5 text-plasma-glow">
        {Array.from({ length: 5 }).map((_, index) => (
          <Icon
            key={index}
            name="star"
            className="text-sm"
            filled={index < rating}
          />
        ))}
      </div>
      <p
        className={
          compact
            ? "font-body-md italic text-on-surface-variant line-clamp-4"
            : "font-body-lg italic text-on-surface-variant"
        }
      >
        &ldquo;{review.text}&rdquo;
      </p>
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <cite className="font-label-md uppercase not-italic text-on-surface">
          {reviewDisplayName(review)}
        </cite>
        <span className="bg-secondary-container/30 px-2 py-1 font-label-sm uppercase tracking-widest text-secondary">
          Verified Purchase
        </span>
      </footer>
    </blockquote>
  );
}

export function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-plasma-glow transition-transform hover:scale-110"
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            <Icon name="star" className="text-2xl" filled={star <= value} />
          </button>
        );
      })}
    </div>
  );
}
