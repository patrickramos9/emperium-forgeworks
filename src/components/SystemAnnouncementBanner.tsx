import { useAnnouncementContext } from "@/context/AnnouncementContext";

export function SystemAnnouncementBanner() {
  const { systemBanner } = useAnnouncementContext();
  if (!systemBanner) return null;

  const message = systemBanner.body.trim()
    ? `${systemBanner.title} — ${systemBanner.body.trim()}`
    : systemBanner.title;

  return (
    <div
      role="status"
      className="w-full border-b border-primary/30 bg-primary px-4 py-2 text-center"
    >
      <p className="font-label-md uppercase tracking-wide text-on-primary">
        {message}
      </p>
    </div>
  );
}
