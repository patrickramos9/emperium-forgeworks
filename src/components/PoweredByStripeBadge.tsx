import { useState } from "react";

/** Served from Vite `public/` → https://emperiumforgeworks.com/images/powered-by-stripe.jpg */
const STRIPE_BADGE_SRC = "/images/powered-by-stripe.jpg";

type Props = {
  /** Stretch to container width (e.g. match checkout button row). */
  fullWidth?: boolean;
  /** Tailwind height class when not fullWidth. */
  heightClass?: string;
  className?: string;
};

export function PoweredByStripeBadge({
  fullWidth = false,
  heightClass = "h-14",
  className = "",
}: Props) {
  const [missing, setMissing] = useState(false);

  if (missing) return null;

  return (
    <a
      href="https://stripe.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by Stripe"
      className={`block transition-opacity hover:opacity-90 ${className}`}
    >
      <img
        src={STRIPE_BADGE_SRC}
        alt=""
        width={178}
        height={39}
        className={
          fullWidth
            ? "h-14 w-full object-cover object-center sm:h-16"
            : `${heightClass} w-auto`
        }
        loading="lazy"
        decoding="async"
        onError={() => setMissing(true)}
      />
    </a>
  );
}
