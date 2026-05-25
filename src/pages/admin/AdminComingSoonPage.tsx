import { Link } from "react-router-dom";

export function AdminComingSoonPage({
  title,
  milestone,
  description,
}: {
  title: string;
  milestone: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-lg border border-outline-variant/20 bg-surface-container-low p-8 iron-bevel">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        {title}
      </h1>
      <p className="mt-4 text-on-surface-variant">{description}</p>
      <p className="mt-2 font-label-sm uppercase text-on-surface-variant/70">
        Planned for {milestone}
      </p>
      <Link
        to="/admin"
        className="mt-6 inline-block font-label-sm uppercase text-primary hover:underline"
      >
        ← Dashboard
      </Link>
    </div>
  );
}
