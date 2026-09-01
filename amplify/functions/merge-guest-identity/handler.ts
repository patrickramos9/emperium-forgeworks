import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import { verifyGuestToken } from "../guest-shared/cookie.js";
import {
  applyProductCartCountDelta,
  productIdsInCartLines,
} from "../cart-shared/productCartCounts.js";
import {
  lineItemsJsonFromSnapshot,
  mergeCartLineItems,
  parseLineItems,
  snapshotHasItems,
  snapshotSignature,
} from "../cart-shared/snapshotLines.js";
import {
  findActiveTemplate,
  issueAbandonedCartGrantIfNeeded,
  issueFavoriteGrantIfNeeded,
  listAllTemplates,
} from "../promo-shared/grantIssuance.js";
import { adjustProductFavoriteCount } from "../favorite-shared/productFavoriteCounts.js";
import { resolveContactEmail } from "../order-shared/resolveContactEmail.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

const DEFAULT_ABANDON_HOURS = 24;

async function mergeGuestCartIntoUser(
  userId: string,
  guestId: string,
): Promise<number> {
  const guestModel = dataClient.models.GuestCartSnapshot;
  if (!guestModel) return 0;

  const guestResult = await guestModel.get({ guestId });
  if (guestResult.errors?.length) {
    throw new Error(guestResult.errors.map((e) => e.message).join("; "));
  }
  const guestRow = guestResult.data;
  if (!guestRow) return 0;

  const guestLines = parseLineItems(guestRow.lineItems);
  if (!snapshotHasItems(guestLines)) {
    await guestModel.delete({ guestId });
    return 0;
  }

  const userResult = await dataClient.models.CartSnapshot.get({ userId });
  if (userResult.errors?.length) {
    throw new Error(userResult.errors.map((e) => e.message).join("; "));
  }
  const userRow = userResult.data;
  const userLines = parseLineItems(userRow?.lineItems);

  const previousUserIds = productIdsInCartLines(userLines);
  const guestProductIds = productIdsInCartLines(guestLines);
  const mergedLines = mergeCartLineItems(userLines, guestLines);
  const nextUserIds = productIdsInCartLines(mergedLines);
  const now = new Date().toISOString();

  // Drop guest cart contribution to counts, then apply user cart U → merged.
  try {
    await applyProductCartCountDelta(dataClient, guestProductIds, new Set());
    await applyProductCartCountDelta(dataClient, previousUserIds, nextUserIds);
  } catch (err) {
    console.error("Cart count merge update failed", err);
  }

  const linesChanged =
    !userRow ||
    snapshotSignature(userLines) !== snapshotSignature(mergedLines);

  // Prefer older updatedAt so idle/abandon still reflects guest browse time when user cart was empty/newer.
  const guestUpdatedMs = guestRow.updatedAt
    ? Date.parse(guestRow.updatedAt)
    : Date.now();
  const userUpdatedMs = userRow?.updatedAt
    ? Date.parse(userRow.updatedAt)
    : Number.POSITIVE_INFINITY;
  const mergedUpdatedAt =
    !userRow || !snapshotHasItems(userLines)
      ? (guestRow.updatedAt ?? now)
      : guestUpdatedMs < userUpdatedMs
        ? (guestRow.updatedAt ?? now)
        : (userRow.updatedAt ?? now);

  let grantIssued = false;
  const templates = await listAllTemplates(dataClient);
  const template = findActiveTemplate(templates, "useForAbandonedCart");
  const abandonHours =
    template?.abandonAfterHours != null && template.abandonAfterHours > 0
      ? template.abandonAfterHours
      : DEFAULT_ABANDON_HOURS;
  const idleHours = (Date.now() - Date.parse(mergedUpdatedAt)) / (1000 * 60 * 60);
  if (snapshotHasItems(mergedLines) && idleHours >= abandonHours) {
    try {
      grantIssued = await issueAbandonedCartGrantIfNeeded(
        dataClient,
        userId,
        userId,
      );
    } catch (err) {
      console.error("Abandoned cart grant on merge failed", err);
    }
  }

  const payload = {
    userId,
    lineItems: lineItemsJsonFromSnapshot(mergedLines),
    updatedAt: linesChanged ? mergedUpdatedAt : (userRow?.updatedAt ?? now),
    abandonedAt: grantIssued
      ? now
      : (userRow?.abandonedAt ?? guestRow.abandonedAt ?? null),
  };

  if (userRow) {
    const updateResult = await dataClient.models.CartSnapshot.update(payload);
    if (updateResult.errors?.length) {
      throw new Error(updateResult.errors.map((e) => e.message).join("; "));
    }
  } else {
    const createResult = await dataClient.models.CartSnapshot.create(payload);
    if (createResult.errors?.length) {
      throw new Error(createResult.errors.map((e) => e.message).join("; "));
    }
  }

  const deleteResult = await guestModel.delete({ guestId });
  if (deleteResult.errors?.length) {
    throw new Error(deleteResult.errors.map((e) => e.message).join("; "));
  }

  return 1;
}

async function listGuestFavoritesForMerge(guestId: string) {
  const GuestFavorite = dataClient.models.GuestFavorite;
  if (!GuestFavorite) return [];

  const rows: { productId: string; productSlug?: string | null }[] = [];
  let nextToken: string | undefined;

  do {
    const response = await GuestFavorite.list({
      filter: { guestId: { eq: guestId } },
      limit: 100,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row?.productId) {
        rows.push({
          productId: row.productId,
          productSlug: row.productSlug,
        });
      }
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows;
}

async function mergeGuestFavoritesIntoUser(
  userId: string,
  guestId: string,
): Promise<number> {
  const GuestFavorite = dataClient.models.GuestFavorite;
  if (!GuestFavorite) return 0;

  const guestRows = await listGuestFavoritesForMerge(guestId);
  if (!guestRows.length) return 0;

  let favoritesMerged = 0;

  for (const row of guestRows) {
    const productId = row.productId;
    const productSlug = row.productSlug?.trim() || undefined;

    const existing = await dataClient.models.Favorite.get({
      userId,
      productId,
    });
    if (existing.errors?.length) {
      throw new Error(existing.errors.map((e) => e.message).join("; "));
    }

    const alreadyFavorited = Boolean(existing.data);

    // Drop guest contribution to favoriteCount first.
    const deleteGuest = await GuestFavorite.delete({ guestId, productId });
    if (deleteGuest.errors?.length) {
      throw new Error(deleteGuest.errors.map((e) => e.message).join("; "));
    }
    try {
      await adjustProductFavoriteCount(dataClient, productId, -1);
    } catch (err) {
      console.error("Favorite count decrement on merge failed", err);
    }

    if (!alreadyFavorited) {
      const createResult = await dataClient.models.Favorite.create({
        userId,
        productId,
        ...(productSlug ? { productSlug } : {}),
      });
      if (createResult.errors?.length) {
        throw new Error(createResult.errors.map((e) => e.message).join("; "));
      }
      try {
        await adjustProductFavoriteCount(dataClient, productId, 1);
      } catch (err) {
        console.error("Favorite count increment on merge failed", err);
      }
      favoritesMerged += 1;

      try {
        await issueFavoriteGrantIfNeeded(dataClient, userId, productId);
      } catch (err) {
        console.error("Favorite grant on merge failed", err);
      }
    }
  }

  return favoritesMerged;
}

async function mergeGuestPrintRequestsIntoUser(
  userId: string,
  guestId: string,
): Promise<number> {
  const rows: Schema["PrintRequest"]["type"][] = [];
  let nextToken: string | undefined;

  do {
    const response = await dataClient.models.PrintRequest.list({
      filter: { guestId: { eq: guestId } },
      limit: 50,
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

  let merged = 0;
  for (const row of rows) {
    if (!row.id) continue;
    if (row.userId === userId && !row.guestId) continue;

    const { errors } = await dataClient.models.PrintRequest.update({
      id: row.id,
      userId,
      guestId: null,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    merged += 1;
  }

  return merged;
}

async function mergeGuestNotificationsIntoUser(
  userId: string,
  guestId: string,
): Promise<number> {
  const GuestNotification = dataClient.models.GuestNotification;
  if (!GuestNotification) return 0;

  const rows: Schema["GuestNotification"]["type"][] = [];
  let nextToken: string | undefined;
  do {
    const response = await GuestNotification.list({
      filter: { guestId: { eq: guestId } },
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

  let merged = 0;
  for (const row of rows) {
    if (!row.id) continue;

    const createResult = await dataClient.models.Notification.create({
      title: row.title,
      body: row.body,
      kind: row.kind ?? "order",
      userId,
      active: row.active !== false,
      sortOrder: row.sortOrder ?? 0,
    });
    if (createResult.errors?.length) {
      throw new Error(createResult.errors.map((e) => e.message).join("; "));
    }

    const newId = createResult.data?.id;
    if (newId && row.readAt) {
      const readResult = await dataClient.models.NotificationRead.create({
        notificationId: newId,
        userId,
        readAt: row.readAt,
      });
      if (readResult.errors?.length) {
        console.error(
          "NotificationRead on merge failed",
          readResult.errors.map((e) => e.message).join("; "),
        );
      }
    }

    const deleteResult = await GuestNotification.delete({ id: row.id });
    if (deleteResult.errors?.length) {
      throw new Error(deleteResult.errors.map((e) => e.message).join("; "));
    }
    merged += 1;
  }

  return merged;
}

async function mergeGuestOrdersIntoUser(
  userId: string,
  guestId: string,
): Promise<number> {
  const rows: Schema["Order"]["type"][] = [];
  let nextToken: string | undefined;

  do {
    const response = await dataClient.models.Order.list({
      filter: { guestId: { eq: guestId } },
      limit: 50,
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

  let merged = 0;
  for (const row of rows) {
    if (!row.id) continue;
    if (row.userId === userId && !row.guestId) continue;

    const { errors } = await dataClient.models.Order.update({
      id: row.id,
      userId,
      guestId: null,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    merged += 1;
  }

  return merged;
}

async function mergeGuestConversationsIntoUser(
  userId: string,
  guestId: string,
): Promise<number> {
  const Conversation = dataClient.models.Conversation;
  const Message = dataClient.models.Message;
  if (!Conversation || !Message) return 0;

  const rows: Schema["Conversation"]["type"][] = [];
  let nextToken: string | undefined;
  do {
    const response = await Conversation.list({
      filter: { guestId: { eq: guestId } },
      limit: 50,
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

  let merged = 0;
  const accountEmail = await resolveContactEmail({ userId });

  for (const row of rows) {
    if (!row.id) continue;

    const { errors } = await Conversation.update({
      id: row.id,
      userId,
      guestId: null,
      ...(!row.customerEmail?.trim() && accountEmail
        ? { customerEmail: accountEmail }
        : {}),
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }

    const messageIds: string[] = [];
    let msgToken: string | undefined;
    do {
      const msgResponse = await Message.list({
        filter: { conversationId: { eq: row.id } },
        limit: 100,
        nextToken: msgToken,
      });
      if (msgResponse.errors?.length) {
        throw new Error(msgResponse.errors.map((e) => e.message).join("; "));
      }
      for (const msg of msgResponse.data ?? []) {
        if (msg?.id) messageIds.push(msg.id);
      }
      msgToken = msgResponse.nextToken ?? undefined;
    } while (msgToken);

    for (const messageId of messageIds) {
      const { errors: msgErrors } = await Message.update({
        id: messageId,
        conversationUserId: userId,
      });
      if (msgErrors?.length) {
        // Message may lack update in client auth modes; recreate ownership via delete+create is worse.
        // Resource-backed merge Lambda should allow update; log and continue if model rejects.
        console.warn("Message ownership update failed", messageId, msgErrors);
      }
    }

    merged += 1;
  }

  return merged;
}

/**
 * M6e — verify guest token + Cognito sub; merge guest cart, favorites, prints, notifications, orders, conversations.
 */
export const handler: Schema["mergeGuestIdentity"]["functionHandler"] = async (
  event,
) => {
  const userId =
    event.identity && "sub" in event.identity
      ? (event.identity.sub as string | undefined)
      : undefined;
  if (!userId) {
    throw new Error("Sign in to merge guest data.");
  }

  const guestId = event.arguments.guestId?.trim() ?? "";
  const guestToken = event.arguments.guestToken?.trim() ?? "";

  const valid = await verifyGuestToken(guestId, guestToken);
  if (!valid) {
    throw new Error("Invalid or expired guest session.");
  }

  const cartsMerged = await mergeGuestCartIntoUser(userId, guestId);
  const favoritesMerged = await mergeGuestFavoritesIntoUser(userId, guestId);
  const printRequestsMerged = await mergeGuestPrintRequestsIntoUser(
    userId,
    guestId,
  );
  const notificationsMerged = await mergeGuestNotificationsIntoUser(
    userId,
    guestId,
  );
  const ordersMerged = await mergeGuestOrdersIntoUser(userId, guestId);
  const conversationsMerged = await mergeGuestConversationsIntoUser(
    userId,
    guestId,
  );

  // Belt-and-suspenders: never leave a guest cart row after merge.
  if (dataClient.models.GuestCartSnapshot) {
    try {
      await dataClient.models.GuestCartSnapshot.delete({ guestId });
    } catch {
      /* already deleted or missing */
    }
  }

  return {
    merged: true,
    guestId,
    userId,
    cartsMerged,
    favoritesMerged,
    printRequestsMerged,
    notificationsMerged,
    ordersMerged,
    conversationsMerged,
  };
};
