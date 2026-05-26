import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { CONTACT_EMAIL } from "@/lib/config";
import { LEGACY_IMAGES } from "@/data/legacyAssets";

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

const TESTIMONIALS = [
  {
    quote:
      "unbelievably clean prints! Will definitely be ordering some more from this shop!",
    author: "Christian",
  },
  {
    quote:
      "The Eldritch Dragon is a centerpiece on my table. Arrived perfectly packed.",
    author: "Alex M.",
  },
];

const SCULPTORS = [
  {
    name: "NSMiniatures",
    status: "active" as const,
    image: LEGACY_IMAGES.process.nsMini1,
  },
  {
    name: "Abyssal Sculpts",
    status: "soon" as const,
    image: LEGACY_IMAGES.home.darkFantasy,
  },
  {
    name: "Void Weavers",
    status: "soon" as const,
    image: LEGACY_IMAGES.home.eldritch,
  },
];

export function HomePage() {
  return (
    <main className="pb-section-gap pt-[88px]">
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
          <Link
            to="/shop?category=Sci-Fi"
            className="group relative flex min-h-[320px] flex-col justify-end overflow-hidden bg-surface-container-low iron-bevel md:row-span-2 md:min-h-[480px]"
          >
            <img
              src={LEGACY_IMAGES.home.voidboundSentinel}
              alt="Voidbound Sentinels"
              className="absolute inset-0 h-full w-full object-cover grayscale brightness-75 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="relative z-10 p-stack-lg">
              <span className="font-label-sm uppercase tracking-widest text-secondary">
                Series 01
              </span>
              <h3 className="mt-1 font-display-lg text-headline-lg uppercase text-on-surface">
                Voidbound Sentinels
              </h3>
              <span className="mt-4 inline-flex items-center gap-1 font-label-md uppercase text-primary">
                Deploy Forces
                <Icon name="arrow_forward" className="text-sm" />
              </span>
            </div>
          </Link>
          <Link
            to="/shop?category=Dark%20Fantasy"
            className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden bg-surface-container-low iron-bevel"
          >
            <img
              src={LEGACY_IMAGES.home.darkFantasy}
              alt="Dark Fantasy"
              className="absolute inset-0 h-full w-full object-cover grayscale brightness-75 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="relative z-10 p-stack-lg">
              <h3 className="font-display-lg text-headline-md uppercase text-on-surface">
                Dark Fantasy
              </h3>
            </div>
          </Link>
          <div className="flex min-h-[220px] flex-col items-center justify-center border border-secondary/20 bg-void-purple/30 p-stack-lg text-center iron-bevel backdrop-blur-sm">
            <Icon name="architecture" className="mb-4 text-5xl text-secondary" />
            <h3 className="font-display-lg text-headline-md uppercase text-on-surface">
              Custom Forge
            </h3>
            <p className="mt-2 font-body-md text-on-surface-variant">
              Commission bespoke sculpts and print runs.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 font-label-md uppercase tracking-widest text-primary hover:text-plasma-glow"
            >
              Start Commission
            </a>
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

      {/* Testimonials */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <h2 className="mb-stack-lg border-b-2 border-primary pb-2 font-display-lg text-headline-lg uppercase tracking-tighter text-on-surface">
          Voices from the Forge
        </h2>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.author}
              className="border border-outline-variant/10 bg-surface-container-low p-stack-lg iron-bevel"
            >
              <div className="mb-3 flex gap-0.5 text-plasma-glow">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name="star" className="text-sm" filled />
                ))}
              </div>
              <p className="font-body-lg italic text-on-surface-variant">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-4 flex items-center justify-between">
                <cite className="font-label-md uppercase not-italic text-on-surface">
                  {t.author}
                </cite>
                <span className="bg-secondary-container/30 px-2 py-1 font-label-sm uppercase tracking-widest text-secondary">
                  Verified Purchase
                </span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Sculptors */}
      <section className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
        <h2 className="mb-stack-lg border-b-2 border-primary pb-2 font-display-lg text-headline-lg uppercase tracking-tighter text-on-surface">
          The Master Sculptors
        </h2>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {SCULPTORS.map((s) => (
            <article
              key={s.name}
              className="group relative overflow-hidden bg-surface-container-low iron-bevel"
            >
              <div className="aspect-[4/3] overflow-hidden bg-black">
                <img
                  src={s.image}
                  alt={s.name}
                  className="h-full w-full object-cover grayscale brightness-90 transition-all duration-700 group-hover:grayscale-0"
                />
              </div>
              <div className="p-4">
                <span className="absolute right-4 top-4 bg-void-purple/80 px-2 py-1 font-label-sm uppercase tracking-widest text-secondary">
                  Licensed Partner
                </span>
                <h3 className="font-headline-md text-on-surface">{s.name}</h3>
                {s.status === "active" ? (
                  <Link
                    to="/shop"
                    className="mt-2 inline-block font-label-md uppercase text-primary hover:text-plasma-glow"
                  >
                    View Collection
                  </Link>
                ) : (
                  <p className="mt-2 font-label-sm uppercase tracking-widest text-on-surface-variant">
                    Coming Soon
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="border border-outline-variant/10 bg-surface-container-low p-stack-lg text-center iron-bevel md:p-margin-desktop">
          <h2 className="font-display-lg text-headline-lg uppercase tracking-tighter text-on-surface">
            Join the Forge
          </h2>
          <p className="mt-2 font-body-md text-on-surface-variant">
            No spam. Only artifacts of power.
          </p>
          <form
            className="mx-auto mt-stack-lg flex max-w-md flex-col gap-stack-sm sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-grow border border-outline-variant/30 bg-surface-container-high px-4 py-3 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="bg-primary-container px-6 py-3 font-label-md uppercase tracking-widest text-on-primary transition-all hover:brightness-110"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
