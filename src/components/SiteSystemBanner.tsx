import { SystemAnnouncementBanner } from "@/components/SystemAnnouncementBanner";
import { useAnnouncementContext } from "@/context/AnnouncementContext";

/** Fixed site-wide system announcement bar (maintenance, construction, etc.). */
export function SiteSystemBanner() {
  const { hasSystemBanner } = useAnnouncementContext();
  if (!hasSystemBanner) return null;

  return (
    <div className="fixed top-0 z-[60] w-full">
      <SystemAnnouncementBanner />
    </div>
  );
}
