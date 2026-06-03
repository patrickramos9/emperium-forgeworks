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

function isVisibleToUser(row: NotificationRecord, userId: string): boolean {
  const targetUserId = row.userId?.trim();
  return !targetUserId || targetUserId === userId;
}

export async function listCustomerNotifications(
  client: AmplifyDataClient,
): Promise<NotificationRecord[]> {
  const userId = await getCustomerUserId();
  if (!userId) return [];

  const all = await listAdminNotifications(client);
  const nowIso = new Date().toISOString();
  return all.filter(
    (row) => isActiveNow(row, nowIso) && isVisibleToUser(row, userId),
  );
}

/** Inbox message when admin grants or re-enables Hidden Vault access for a customer. */
export async function createPromoGrantNotification(
  client: AmplifyDataClient,
  input: { userId: string; title: string; body: string },
): Promise<void> {
  const result = await client.models.Notification.create({
    title: input.title,
    body: input.body,
    kind: "marketing",
    userId: input.userId,
    active: true,
    sortOrder: 50,
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
}

export async function createVaultAccessGrantedNotification(
  client: AmplifyDataClient,
  userId: string,
): Promise<void> {
  const result = await client.models.Notification.create({
    title: "Hidden Vault access granted",
    body: "You now have permission to browse the Hidden Vault. When signed in, open Vault from the main navigation or visit /vault.",
    kind: "system",
    userId,
    active: true,
    sortOrder: 100,
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
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
