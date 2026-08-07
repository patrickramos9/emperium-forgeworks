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
  listAllTemplates,
} from "../promo-shared/grantIssuance.js";

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

/**
 * M6e — verify guest token + Cognito sub; merge guest cart into user CartSnapshot.
 * Favorites / print requests: still stubs until those models support guest ownership.
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

  return {
    merged: true,
    guestId,
    userId,
    cartsMerged,
    favoritesMerged: 0,
    printRequestsMerged: 0,
  };
};
