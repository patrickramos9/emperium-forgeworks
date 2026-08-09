import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import { verifyGuestToken } from "../guest-shared/cookie.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

type AppSyncEvent = {
  fieldName?: string;
  info?: { fieldName?: string };
  arguments: {
    guestId?: string | null;
    guestToken?: string | null;
    notificationId?: string | null;
  };
};

function resolveFieldName(event: AppSyncEvent): string {
  return event.fieldName ?? event.info?.fieldName ?? "";
}

async function requireGuestId(event: AppSyncEvent): Promise<string> {
  const guestId = event.arguments.guestId?.trim() ?? "";
  const guestToken = event.arguments.guestToken?.trim() ?? "";
  if (!(await verifyGuestToken(guestId, guestToken))) {
    throw new Error("Invalid or missing guest session.");
  }
  return guestId;
}

function toItem(row: Schema["GuestNotification"]["type"]) {
  return {
    id: row.id,
    guestId: row.guestId,
    title: row.title,
    body: row.body,
    kind: row.kind ?? "order",
    readAt: row.readAt ?? undefined,
    createdAt: row.createdAt ?? undefined,
    sortOrder: row.sortOrder ?? 0,
  };
}

async function handleGetGuestNotifications(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const model = dataClient.models.GuestNotification;
  if (!model) {
    throw new Error("Guest notifications are not deployed yet.");
  }

  const rows: ReturnType<typeof toItem>[] = [];
  let nextToken: string | undefined;
  do {
    const response = await model.list({
      filter: { guestId: { eq: guestId } },
      limit: 100,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row?.id && row.active !== false) {
        rows.push(toItem(row));
      }
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  rows.sort((a, b) => {
    const pin = (b.sortOrder ?? 0) - (a.sortOrder ?? 0);
    if (pin !== 0) return pin;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  return { notifications: rows };
}

async function handleMarkGuestNotificationRead(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const notificationId = event.arguments.notificationId?.trim() ?? "";
  if (!notificationId) {
    throw new Error("Notification id is required.");
  }

  const model = dataClient.models.GuestNotification;
  if (!model) {
    throw new Error("Guest notifications are not deployed yet.");
  }

  const existing = await model.get({ id: notificationId });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }
  const row = existing.data;
  if (!row || row.guestId !== guestId) {
    throw new Error("Notification not found.");
  }

  if (row.readAt) {
    return { success: true };
  }

  const readAt = new Date().toISOString();
  const update = await model.update({ id: notificationId, readAt });
  if (update.errors?.length) {
    throw new Error(update.errors.map((e) => e.message).join("; "));
  }
  return { success: true };
}

export const handler = async (event: AppSyncEvent) => {
  const fieldName = resolveFieldName(event);
  if (fieldName === "markGuestNotificationRead") {
    return handleMarkGuestNotificationRead(event);
  }
  // getGuestNotifications (default)
  return handleGetGuestNotifications(event);
};
