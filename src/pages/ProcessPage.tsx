import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { LEGACY_IMAGES } from "@/data/legacyAssets";

const STEPS = [
  {
    step: "01 / INITIALIZATION",
    title: "3D Printing",
    description:
      "Utilizing high-density liquid resin and ultra-high-resolution monochromatic screens to capture every serrated edge and gothic detail.",
    image: LEGACY_IMAGES.process.printing,
  },
  {
    step: "02 / PURIFICATION",
    title: "Chemical Wash",
    description:
      "Submerged in specialized chemical baths to remove excess resin, ensuring intricate sculpts remain sharp and free of residue.",
    image: LEGACY_IMAGES.process.wash,
  },
  {
    step: "03 / EXTRACTION",
    title: "Support Removal",
    description:
      "Meticulous removal of lattice structures. Each miniature is inspected under magnification for surgical precision.",
    image: LEGACY_IMAGES.process.supports,
  },
  {
    step: "04 / HARDENING",
    title: "UV Curing",
    description:
      "Targeted UV radiation stabilizes the molecular structure, solidifying the resin into its permanent, rigid form.",
    image: LEGACY_IMAGES.process.curing,
  },
];

export function ProcessPage() {
  return (
    <main className="pb-section-gap pt-[88px]">
      <section className="relative flex h-[614px] items-center overflow-hidden border-b border-outline-variant/10">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <img
          src={LEGACY_IMAGES.process.hero}
          alt="Industrial forge workshop"
          className="absolute inset-0 h-full w-full object-cover opacity-40 grayscale"
        />
        <div className="relative z-20 mx-auto w-full max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="max-w-2xl space-y-stack-md">
            <div className="inline-block rounded-sm border border-secondary/20 bg-void-purple/30 px-3 py-1">
              <span className="font-label-sm uppercase tracking-widest text-secondary">
                The Artifact Genesis
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg uppercase tracking-tighter text-primary">
              Forged in Resin.
              <br />
              Born in Shadow.
            </h1>
            <p className="font-body-lg text-on-surface-variant">
              Based in Miami, Florida, Emperium Forgeworks is more than a
              studio—it&apos;s a digital foundry dedicated to manifesting the
              dark and the divine through premium resin miniatures.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="mb-12 flex flex-col items-end gap-stack-lg md:flex-row">
          <h2 className="border-l-4 border-primary pl-6 font-display-lg text-headline-lg uppercase text-primary">
            The Ritual of Fabrication
          </h2>
          <p className="mb-2 font-label-md uppercase tracking-widest text-on-surface-variant/60">
            Protocol 449-B: Quality Assurance
          </p>
        </div>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-4">
          {STEPS.map((step) => (
            <article
              key={step.title}
              className="group relative border border-outline-variant/10 bg-surface-container-low p-stack-lg inner-bevel transition-all duration-500 hover:border-primary/30"
            >
              <span className="mb-4 block font-label-sm text-plasma-glow">
                {step.step}
              </span>
              <h3 className="mb-stack-md font-headline-md text-on-surface">
                {step.title}
              </h3>
              <p className="mb-6 font-body-md text-on-surface-variant">
                {step.description}
              </p>
              <div className="aspect-square overflow-hidden bg-iron-gray">
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-outline-variant/10 bg-surface-container-lowest py-section-gap">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
            <div className="space-y-stack-lg md:col-span-5">
              <span className="font-label-md uppercase tracking-[0.2em] text-secondary">
                Affiliated Forge
              </span>
              <h2 className="font-display-lg text-display-lg leading-none text-on-surface">
                NSMiniatures
              </h2>
              <div className="h-1 w-24 bg-secondary" />
              <p className="font-body-lg leading-relaxed text-on-surface-variant">
                The visionary studio behind{" "}
                <span className="font-bold text-secondary">
                  The Petrified Choir Collection
                </span>
                . Based in Miami, NSMiniatures translates eldritch horrors into
                tangible nightmares.
              </p>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-secondary px-6 py-3 font-label-md uppercase tracking-wider text-on-secondary transition-colors hover:bg-on-secondary-container"
              >
                View Collection
                <Icon name="open_in_new" className="text-sm" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-stack-md md:col-span-7">
              <div className="group relative aspect-[4/5] overflow-hidden rounded-sm bg-iron-gray">
                <div className="absolute inset-0 z-10 bg-void-purple/20 transition-colors group-hover:bg-transparent" />
                <img
                  src={LEGACY_IMAGES.process.nsMini1}
                  alt="Eldritch sculpture"
                  className="h-full w-full object-cover brightness-75 grayscale transition-all duration-500 group-hover:brightness-100 group-hover:grayscale-0"
                />
              </div>
              <div className="space-y-stack-md">
                <div className="group relative aspect-square overflow-hidden rounded-sm bg-iron-gray">
                  <div className="absolute inset-0 z-10 bg-void-purple/20 transition-colors group-hover:bg-transparent" />
                  <img
                    src={LEGACY_IMAGES.process.nsMini2}
                    alt="Miniature detail"
                    className="h-full w-full object-cover brightness-75 grayscale transition-all duration-500 group-hover:brightness-100 group-hover:grayscale-0"
                  />
                </div>
                <div className="border-l-2 border-secondary bg-surface-container p-stack-md">
                  <h4 className="mb-2 font-label-md uppercase text-secondary">
                    Creative Vision
                  </h4>
                  <p className="text-body-md text-on-surface-variant">
                    &ldquo;From twisted horrors to towering eldritch beings.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="forge-story"
        className="mx-auto max-w-container-max overflow-hidden px-margin-mobile py-section-gap md:px-margin-desktop"
      >
        <div className="relative border border-outline-variant/20 bg-surface-container-high p-stack-lg inner-bevel md:p-margin-desktop">
          <div className="absolute right-0 top-0 h-64 w-64 bg-primary/5 blur-[100px]" />
          <div className="grid grid-cols-1 items-center gap-margin-desktop md:grid-cols-2">
            <div className="order-2 space-y-stack-md md:order-1">
              <span className="font-label-md uppercase tracking-[0.3em] text-primary">
                Miami Protocol
              </span>
              <h2 className="font-display-lg text-display-lg uppercase tracking-tighter text-on-surface">
                Forge Story
              </h2>
              <div className="h-px w-full bg-gradient-to-r from-primary/50 to-transparent" />
              <p className="font-body-lg leading-relaxed text-on-surface-variant">
                Emperium Forgeworks emerged from a singular obsession: the pursuit
                of the perfect print. In the heart of Miami, we&apos;ve established
                a sanctuary for wargamers and RPG enthusiasts who refuse to settle
                for the standard.
              </p>
              <p className="font-body-md text-on-surface-variant/80">
                Every artifact that leaves our studio has been personally vetted
                for structural integrity and aesthetic fidelity.
              </p>
              <div className="grid grid-cols-2 gap-gutter pt-stack-md">
                <div>
                  <h5 className="font-headline-md text-primary">31+</h5>
                  <p className="font-label-sm uppercase text-on-surface-variant">
                    Successful Forgings
                  </p>
                </div>
                <div>
                  <h5 className="font-headline-md text-primary">5.0</h5>
                  <p className="font-label-sm uppercase text-on-surface-variant">
                    Quality Index
                  </p>
                </div>
              </div>
            </div>
            <div className="relative order-1 md:order-2">
              <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 border-2 border-primary/20" />
              <img
                src={LEGACY_IMAGES.process.workshop}
                alt="Workshop"
                className="aspect-square w-full object-cover shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-margin-mobile py-section-gap text-center md:px-margin-desktop">
        <div className="mx-auto max-w-2xl space-y-stack-md">
          <h2 className="font-display-lg text-headline-lg uppercase text-on-surface">
            Ready to Summon Your Fleet?
          </h2>
          <p className="font-body-lg text-on-surface-variant">
            Browse our latest licensed sculpts and original prints.
          </p>
          <Link
            to="/shop"
            className="molten-glow inline-block bg-primary px-10 py-4 font-display-lg text-headline-md uppercase tracking-widest text-on-primary transition-all hover:scale-105 active:scale-95"
          >
            Enter the Shop
          </Link>
        </div>
      </section>
    </main>
  );
}
