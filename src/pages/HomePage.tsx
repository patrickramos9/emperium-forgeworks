import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FeaturedProductsCarousel } from "@/components/FeaturedProductsCarousel";
import { Icon } from "@/components/Icon";
import { ReviewCard } from "@/components/ReviewCard";
import { ETSY_SHOP_REVIEWS_URL } from "@/lib/config";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasReviewModel } from "@/lib/dataModels";
import { useSiteLayout } from "@/context/AnnouncementContext";
import { SculptorCard } from "@/components/SculptorCard";
import { LEGACY_IMAGES } from "@/data/legacyAssets";
import { useProducts } from "@/hooks/useProducts";
import { pickFeaturedProducts } from "@/lib/featuredProducts";
import { resolveImageUrl } from "@/lib/productImageUrls";
import { hasSculptorModel } from "@/lib/dataModels";
import {
  listApprovedReviews,
  type ReviewRecord,
} from "@/services/reviewService";
import {
  listAllSculptors,
  type SculptorRecord,
} from "@/services/sculptorService";
import { fetchPrintServiceConfig } from "@/services/printServiceConfigService";

const TECH_SPECS = [
  {
    label: "TECH SPEC 01",
    title: "Ultra-HD Resin",
    body: "High-density liquid resin and ultra-high-resolution screens capture every serrated edge and gothic detail.",
  },
  {
    label: "TECH SPEC 02",
    title: "Hand-Finished",
    body: "Supports removed by hand and inspected under magnification for surgical precision before shipping.",
  },
  {
    label: "TECH SPEC 03",
    title: "Licensed Art",
    body: "Official sculpts from master studios including NSMiniatures — cosmic horrors and elite warriors.",
  },
];

type SculptorWithLogo = SculptorRecord & { logoUrl?: string };

export function HomePage() {
  const { mainTopPadding } = useSiteLayout();
  const { products, loading: productsLoading } = useProducts();
  const featuredProducts = useMemo(
    () => pickFeaturedProducts(products),
    [products],
  );
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [sculptors, setSculptors] = useState<SculptorWithLogo[]>([]);
  const [printServiceActive, setPrintServiceActive] = useState(false);

  useEffect(() => {
    void fetchPrintServiceConfig()
      .then((config) => setPrintServiceActive(config.active))
      .catch(() => setPrintServiceActive(false));
  }, []);

  useEffect(() => {
    async function loadReviews() {
      const client = await getGuestDataClient();
      if (!client || !hasReviewModel(client)) return;
      try {
        setReviews(await listApprovedReviews(client, 4));
      } catch {
        // Home page falls back gracefully when reviews are unavailable.
      }
    }
    void loadReviews();
  }, []);

  useEffect(() => {
    async function loadSculptors() {
      const client = await getGuestDataClient();
      if (!client || !hasSculptorModel(client)) return;
      try {
        const rows = await listAllSculptors(client);
        const withLogos = await Promise.all(
          rows.map(async (row) => ({
            ...row,
            logoUrl: row.logo ? await resolveImageUrl(row.logo) : undefined,
          })),
        );
        setSculptors(withLogos);
      } catch {
        // Home page falls back gracefully when sculptors are unavailable.
      }
    }
    void loadSculptors();
  }, []);

  return (
    <main className={`pb-section-gap ${mainTopPadding}`}>
      {/* Hero */}
      <section className="border-b border-outline-variant/10 bg-black">
        <img
          src={LEGACY_IMAGES.home.brandBanner}
          alt="Emperium Forgeworks — forged in resin, born in shadow"
          className="mx-auto block h-auto w-full max-w-container-max"
          width={1600}
          height={400}
        />
      </section>

      <section className="bg-background px-margin-mobile py-section-gap text-center md:px-margin-desktop">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 font-label-sm uppercase tracking-[0.35em] text-primary">
            Forged in Resin • Born in Shadow
          </p>
          <h1 className="font-display-lg text-display-lg uppercase tracking-tighter text-on-surface">
            Premium Miniatures for the Unyielding
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body-lg text-on-surface-variant">
            High-fidelity 3D prints crafted for grimdark wargaming and tabletop
            RPGs. Every detail is preserved, every edge is sharp.
          </p>
          <div className="mt-stack-lg flex flex-wrap items-center justify-center gap-stack-md">
            <Link
              to="/shop"
              className="molten-glow bg-primary px-8 py-3 font-label-md uppercase tracking-widest text-on-primary transition-all hover:brightness-110"
            >
              Enter the Lair
            </Link>
            <Link
              to="/about"
              className="border border-on-surface/30 px-8 py-3 font-label-md uppercase tracking-widest text-on-surface transition-colors hover:border-primary hover:text-primary"
            >
              About
            </Link>
          </div>
        </div>
      </section>

      {/* Featured collections */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="mb-stack-lg flex items-end justify-between">
          <h2 className="font-display-lg text-headline-lg uppercase tracking-tighter text-primary">
            Featured Collections
          </h2>
          <Link
            to="/shop"
            className="font-label-md uppercase tracking-widest text-primary hover:text-plasma-glow"
          >
            View All Series
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
          <FeaturedProductsCarousel
            products={featuredProducts}
            loading={productsLoading}
          />
          <div className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden bg-surface-container-low iron-bevel">
            <img
              src={LEGACY_IMAGES.home.darkFantasy}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top grayscale brightness-75 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
          <div className="flex min-h-[220px] flex-col items-center justify-center border border-secondary/20 bg-void-purple/30 p-stack-lg text-center iron-bevel backdrop-blur-sm">
            <Icon name="architecture" className="mb-4 text-5xl text-secondary" />
            <h3 className="font-display-lg text-headline-md uppercase text-on-surface">
              Printing as a Service
            </h3>
            <p className="mt-2 font-body-md text-on-surface-variant">
              Upload your STL, choose size and resin, and checkout like any other order.
            </p>
            {printServiceActive ? (
              <Link
                to="/print"
                className="mt-4 font-label-md uppercase tracking-widest text-primary hover:text-plasma-glow"
              >
                Start a print
              </Link>
            ) : (
              <span className="mt-4 font-label-md uppercase tracking-widest text-on-surface-variant opacity-50">
                Coming soon
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Tech specs */}
      <section className="border-y border-outline-variant/10 bg-surface-container-lowest">
        <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile py-section-gap md:grid-cols-3 md:px-margin-desktop">
          {TECH_SPECS.map((spec) => (
            <article
              key={spec.label}
              className="border border-outline-variant/10 bg-surface-container-low p-stack-lg iron-bevel"
            >
              <span className="font-label-sm uppercase tracking-widest text-primary">
                {spec.label}
              </span>
              <h3 className="mt-2 font-headline-md text-on-surface">
                {spec.title}
              </h3>
              <p className="mt-3 font-body-md text-on-surface-variant">
                {spec.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="mb-stack-lg flex flex-wrap items-end justify-between gap-4 border-b-2 border-primary pb-2">
            <h2 className="font-display-lg text-headline-lg uppercase tracking-tighter text-on-surface">
              Voices From The Void
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/reviews"
                className="font-label-md uppercase tracking-widest text-primary hover:text-plasma-glow"
              >
                See all reviews
              </Link>
              <a
                href={ETSY_SHOP_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-label-md uppercase tracking-widest text-primary hover:text-plasma-glow"
              >
                More on Etsy
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard key={review.orderId} review={review} compact />
            ))}
          </div>
        </section>
      )}

      {/* Sculptors */}
      {sculptors.length > 0 && (
        <section className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
          <h2 className="mb-stack-lg border-b-2 border-primary pb-2 font-display-lg text-headline-lg uppercase tracking-tighter text-on-surface">
            The Master Sculptors
          </h2>
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
            {sculptors.map((sculptor) => (
              <SculptorCard
                key={sculptor.slug}
                sculptor={sculptor}
                logoUrl={sculptor.logoUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* Newsletter intentionally omitted until M13b / provider is ready */}
    </main>
  );
}
