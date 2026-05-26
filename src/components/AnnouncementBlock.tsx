import { Icon } from "@/components/Icon";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { pickFeaturedAnnouncement } from "@/lib/announcements";

const FALLBACK = {
  title: "Forge Announcement",
  body: [
    "Welcome to Emperium Forgeworks — your source for premium 3D printed collectibles, sci-fi miniatures, Voidbound Sentinels, and ancient terrors.",
    "Every item is made to order with high-quality resin and surgical precision.",
  ],
};

export function AnnouncementBlock({ className = "" }: { className?: string }) {
  const { announcements, loading } = useAnnouncements();
  const featured = pickFeaturedAnnouncement(announcements);

  const title = featured?.title ?? FALLBACK.title;
  const paragraphs = featured
    ? featured.body.split(/\n{2,}|\n/).filter(Boolean)
    : FALLBACK.body;

  return (
    <div
      className={`relative overflow-hidden border border-outline-variant/10 bg-surface-container-low p-stack-lg iron-bevel ${className}`}
    >
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />
      <h2 className="mb-4 font-display-lg text-headline-lg uppercase tracking-tighter text-primary">
        {title}
      </h2>
      <div className="space-y-4 font-body-lg text-on-surface-variant">
        {loading && !featured ? (
          <p>Loading transmission...</p>
        ) : (
          paragraphs.map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)
        )}
      </div>
      {featured?.pinned && (
        <p className="mt-stack-md flex items-center gap-2 font-label-sm uppercase tracking-widest text-secondary">
          <Icon name="push_pin" className="text-sm" />
          Pinned transmission
        </p>
      )}
    </div>
  );
}
