import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import { getCustomerUserId } from "@/lib/customerAuth";

export type NotificationRecord = Schema["Notification"]["type"];
export type NotificationReadRecord = Schema["NotificationRead"]["type"];

function isActiveNow(row: NotificationRecord, nowIso: string): boolean {
  if (row.active === false) return false;
  if (row.startsAt && row.startsAt > nowIso) return false;
  if (row.endsAt && row.endsAt < nowIso) return false;
  return true;
}

export async function listAdminNotifications(
  client: AmplifyDataClient,
): Promise<NotificationRecord[]> {
  const rows: NotificationRecord[] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.models.Notification.list({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort((a, b) => {
    const pinDiff = Number(b.sortOrder ?? 0) - Number(a.sortOrder ?? 0);
    if (pinDiff !== 0) return pinDiff;
    return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
  });
}

export async function listCustomerNotifications(
  client: AmplifyDataClient,
): Promise<NotificationRecord[]> {
  const all = await listAdminNotifications(client);
  const nowIso = new Date().toISOString();
  return all.filter((row) => isActiveNow(row, nowIso));
}

export async function listMyNotificationReads(
  client: AmplifyDataClient,
): Promise<NotificationReadRecord[]> {
  const userId = await getCustomerUserId();
  if (!userId) return [];

  const rows: NotificationReadRecord[] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.models.NotificationRead.list({
      limit: 200,
      nextToken,
      filter: { userId: { eq: userId } },
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);
  return rows;
}

export async function markNotificationRead(
  client: AmplifyDataClient,
  notificationId: string,
): Promise<void> {
  const userId = await getCustomerUserId();
  if (!userId) return;
  const readAt = new Date().toISOString();
  const createResult = await client.models.NotificationRead.create({
    notificationId,
    userId,
    readAt,
  });
  const createErrors = createResult.errors ?? [];
  if (!createErrors.length) return;

  const alreadyExists = createErrors.some((e) =>
    (e.message ?? "").toLowerCase().includes("already exists"),
  );
  if (!alreadyExists) {
    throw new Error(createErrors.map((e) => e.message).join("; "));
  }

  const updateResult = await client.models.NotificationRead.update({
    notificationId,
    userId,
    readAt,
  });
  if (updateResult.errors?.length) {
    throw new Error(updateResult.errors.map((e) => e.message).join("; "));
  }
}

export function unreadCount(
  notifications: NotificationRecord[],
  reads: NotificationReadRecord[],
): number {
  const readSet = new Set(reads.map((r) => r.notificationId));
  return notifications.reduce(
    (count, n) => count + (readSet.has(n.id) ? 0 : 1),
    0,
  );
}
