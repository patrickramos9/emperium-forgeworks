import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { requireAnnouncementModel } from "@/lib/dataModels";
import type { Schema } from "../../amplify/data/resource";

export type AnnouncementRecord = Schema["Announcement"]["type"];

export async function listAllAnnouncements(
  client: AmplifyDataClient,
): Promise<AnnouncementRecord[]> {
  const Announcement = requireAnnouncementModel(client);
  const rows: AnnouncementRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await Announcement.list({
      limit: 100,
      nextToken,
    });

    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }

    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }

    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.title.localeCompare(b.title),
  );
}
