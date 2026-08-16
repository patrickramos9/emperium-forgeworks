import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { resolveImageUrl } from "@/lib/productImageUrls";
import {
  reviewBadgeLabel,
  reviewDisplayName,
  reviewEtsyUrl,
  reviewImagePaths,
  formatReviewDate,
  type ReviewRecord,
} from "@/services/reviewService";

type ReviewCardProps = {
  review: ReviewRecord;
  compact?: boolean;
};

function ReviewPhotos({
  paths,
  compact = false,
}: {
  paths: string[];
  compact?: boolean;
}) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const resolved = await Promise.all(paths.map((path) => resolveImageUrl(path)));
      if (!cancelled) {
        setUrls(resolved.filter((url): url is string => Boolean(url)));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (urls.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {urls.map((url) => (
        <img
          key={url}
          src={url}
          alt="Customer product photo"
          loading="lazy"
          className={
            compact
              ? "h-16 w-16 border border-outline-variant/20 object-cover"
              : "h-24 w-24 border border-outline-variant/20 object-cover"
          }
        />
      ))}
    </div>
  );
}

export function ReviewCard({ review, compact = false }: ReviewCardProps) {
  const rating = Math.min(5, Math.max(1, review.rating ?? 5));
  const imagePaths = reviewImagePaths(review);
  const etsyUrl = reviewEtsyUrl(review);
  const reviewedOn = formatReviewDate(review);

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
      {imagePaths.length > 0 && (
        <ReviewPhotos paths={imagePaths} compact={compact} />
      )}
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <cite className="font-label-md uppercase not-italic text-on-surface">
          {reviewDisplayName(review)}
          {reviewedOn ? (
            <span className="ml-2 font-label-sm normal-case tracking-normal text-on-surface-variant">
              · {reviewedOn}
            </span>
          ) : null}
        </cite>
        {etsyUrl ? (
          <a
            href={etsyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary-container/30 px-2 py-1 font-label-sm uppercase tracking-widest text-secondary transition-colors hover:bg-secondary-container/50 hover:text-plasma-glow"
            title="View this review on Etsy"
          >
            {reviewBadgeLabel(review)} · View on Etsy
          </a>
        ) : (
          <span className="bg-secondary-container/30 px-2 py-1 font-label-sm uppercase tracking-widest text-secondary">
            {reviewBadgeLabel(review)}
          </span>
        )}
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
