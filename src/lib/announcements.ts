export type AnnouncementKind = "promo" | "system";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  kind: AnnouncementKind;
  pinned: boolean;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  sortOrder: number;
}

export const ANNOUNCEMENT_KIND_LABELS: Record<AnnouncementKind, string> = {
  promo: "Promo & updates",
  system: "System banner",
};

export function mapAnnouncement(row: {
  id: string;
  title: string;
  body: string;
  kind?: string | null;
  pinned?: boolean | null;
  active?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder?: number | null;
}): Announcement {
  const kind = row.kind === "system" ? "system" : "promo";
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    kind,
    pinned: row.pinned ?? false,
    active: row.active ?? true,
    startsAt: row.startsAt ?? undefined,
    endsAt: row.endsAt ?? undefined,
    sortOrder: row.sortOrder ?? 0,
  };
}

function isWithinSchedule(
  startsAt?: string,
  endsAt?: string,
  now = Date.now(),
): boolean {
  if (startsAt && now < new Date(startsAt).getTime()) return false;
  if (endsAt && now > new Date(endsAt).getTime()) return false;
  return true;
}

export function filterActiveAnnouncements(
  announcements: Announcement[],
): Announcement[] {
  return announcements
    .filter((a) => a.active && isWithinSchedule(a.startsAt, a.endsAt))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
}

export function pickFeaturedByKind(
  announcements: Announcement[],
  kind: AnnouncementKind,
): Announcement | undefined {
  return filterActiveAnnouncements(announcements).find((a) => a.kind === kind);
}
