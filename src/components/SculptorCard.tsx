import { Link } from "react-router-dom";
import type { SculptorRecord } from "@/services/sculptorService";

type SculptorCardProps = {
  sculptor: SculptorRecord;
  logoUrl?: string;
};

export function SculptorCard({ sculptor, logoUrl }: SculptorCardProps) {
  const isActive = sculptor.active !== false;

  return (
    <article className="group relative overflow-hidden bg-surface-container-low iron-bevel">
      <div className="aspect-[4/3] overflow-hidden bg-black">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={sculptor.name}
            className="h-full w-full object-cover grayscale brightness-90 transition-all duration-700 group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-iron-gray font-label-sm uppercase text-on-surface-variant">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <span className="absolute right-4 top-4 bg-void-purple/80 px-2 py-1 font-label-sm uppercase tracking-widest text-secondary">
          Licensed Partner
        </span>
        <h3 className="font-headline-md text-on-surface">{sculptor.name}</h3>
        {isActive ? (
          <Link
            to={`/sculptors/${sculptor.slug}`}
            className="mt-2 inline-block font-label-md uppercase text-primary hover:text-plasma-glow"
          >
            View sculptor
          </Link>
        ) : (
          <p className="mt-2 font-label-sm uppercase tracking-widest text-on-surface-variant">
            Coming Soon
          </p>
        )}
      </div>
    </article>
  );
}
