/**
 * Storefront marketing images — all served from Vite `public/images/`.
 * Product catalog photos live in S3 (`products/*`), not here.
 */

export const LEGACY_IMAGES = {
  home: {
    /** Etsy shop banner (local copy). */
    brandBanner: "/images/emperium-forgeworks-hero-banner.png",
    darkFantasy: "/images/home-dark-fantasy.jpg",
  },
  process: {
    hero: "/images/about-hero.jpg",
    printing: "/images/process-printing.jpg",
    wash: "/images/process-wash.jpg",
    supports: "/images/process-supports.jpg",
    curing: "/images/process-curing.jpg",
    /** Studio portrait — Melissa with a printed sculpt. */
    workshop: "/images/melissa-with-sculpt-v3.jpg",
  },
} as const;
