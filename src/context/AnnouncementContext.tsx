import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import {
  pickFeaturedByKind,
  type Announcement,
} from "@/lib/announcements";

type AnnouncementContextValue = {
  loading: boolean;
  loadError: string | null;
  promoFeatured: Announcement | undefined;
  systemBanner: Announcement | undefined;
  hasSystemBanner: boolean;
};

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null);

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const { announcements, loading, error: loadError } = useAnnouncements();

  const value = useMemo(() => {
    const promoFeatured = pickFeaturedByKind(announcements, "promo");
    const systemBanner = pickFeaturedByKind(announcements, "system");
    return {
      loading,
      loadError,
      promoFeatured,
      systemBanner,
      hasSystemBanner: Boolean(systemBanner),
    };
  }, [announcements, loading, loadError]);

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncementContext(): AnnouncementContextValue {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) {
    throw new Error("useAnnouncementContext requires AnnouncementProvider");
  }
  return ctx;
}

/** Layout offsets when a system banner is active. */
export function useSiteLayout() {
  const { hasSystemBanner } = useAnnouncementContext();
  return {
    hasSystemBanner,
    /** Measured header (banner + bar). Fallback matches the bar-only height. */
    mainTopPadding: "pt-[var(--site-header-height,5.5rem)]",
    pageTopPadding: "pt-[var(--site-header-height,8rem)]",
  };
}
