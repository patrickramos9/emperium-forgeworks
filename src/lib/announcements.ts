export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  sortOrder: number;
}

export function mapAnnouncement(row: {
  id: string;
  title: string;
  body: string;
  pinned?: boolean | null;
  active?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder?: number | null;
}): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
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

export function pickFeaturedAnnouncement(
  announcements: Announcement[],
): Announcement | undefined {
  return filterActiveAnnouncements(announcements)[0];
}
