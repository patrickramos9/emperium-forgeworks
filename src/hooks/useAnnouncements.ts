import { useEffect, useState } from "react";
import {
  filterActiveAnnouncements,
  mapAnnouncement,
  type Announcement,
} from "@/lib/announcements";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasAnnouncementModel } from "@/lib/dataModels";
import { listAllAnnouncements } from "@/lib/listAllAnnouncements";

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [active, setActive] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const client = await getGuestDataClient();
      if (!client || !hasAnnouncementModel(client)) {
        if (!cancelled) {
          setAnnouncements([]);
          setActive([]);
          setLoading(false);
        }
        return;
      }

      try {
        const rows = await listAllAnnouncements(client);
        const mapped = rows.map(mapAnnouncement);
        if (!cancelled) {
          setAnnouncements(mapped);
          setActive(filterActiveAnnouncements(mapped));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load announcements",
          );
        }
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { announcements, active, loading, error };
}
