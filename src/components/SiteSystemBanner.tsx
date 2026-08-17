import { SystemAnnouncementBanner } from "@/components/SystemAnnouncementBanner";
import { useAnnouncementContext } from "@/context/AnnouncementContext";

/** System announcement for layouts that are not the storefront header. */
export function SiteSystemBanner() {
  const { hasSystemBanner } = useAnnouncementContext();
  if (!hasSystemBanner) return null;

  return <SystemAnnouncementBanner />;
}
