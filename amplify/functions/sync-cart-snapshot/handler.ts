import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import {
  findActiveTemplate,
  issueAbandonedCartGrantIfNeeded,
  listAllTemplates,
  revokeOpenAbandonedCartGrants,
} from "../promo-shared/grantIssuance.js";
import {
  applyProductCartCountDelta,
  productIdsInCartLines,
} from "../cart-shared/productCartCounts.js";
import {
  lineItemsJsonFromSnapshot,
  normalizeLineItems,
  parseLineItems,
  snapshotHasItems,
  snapshotSignature,
  type CartSnapshotLine,
} from "../cart-shared/snapshotLines.js";
import { verifyGuestToken } from "../guest-shared/cookie.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

const DEFAULT_ABANDON_HOURS = 24;

type SyncResult = {
  synced: boolean;
  grantIssued: boolean;
  grantsRevoked: boolean;
};

async function syncUserCart(
  userId: string,
  lineItems: CartSnapshotLine[],
): Promise<SyncResult> {
  const now = new Date().toISOString();
  const nowMs = Date.now();
  let grantIssued = false;
  let grantsRevoked = false;

  const existing = await dataClient.models.CartSnapshot.get({ userId });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  const incomingHasItems = snapshotHasItems(lineItems);
  const previous = existing.data;
  const previousLines = parseLineItems(previous?.lineItems);
  const previousProductIds = productIdsInCartLines(previousLines);
  const nextProductIds = productIdsInCartLines(lineItems);
  const linesChanged =
    !previous ||
    snapshotSignature(previousLines) !== snapshotSignature(lineItems);

  try {
    await applyProductCartCountDelta(
      dataClient,
      previousProductIds,
      nextProductIds,
    );
  } catch (err) {
    console.error("Product cart count update failed", err);
  }

  if (previous && incomingHasItems && snapshotHasItems(previousLines)) {
    const templates = await listAllTemplates(dataClient);
    const template = findActiveTemplate(templates, "useForAbandonedCart");
    const abandonHours =
      template?.abandonAfterHours != null && template.abandonAfterHours > 0
        ? template.abandonAfterHours
        : DEFAULT_ABANDON_HOURS;

    const updatedAtMs = previous.updatedAt
      ? Date.parse(previous.updatedAt)
      : 0;
    const idleHours = (nowMs - updatedAtMs) / (1000 * 60 * 60);

    if (idleHours >= abandonHours) {
      try {
        grantIssued = await issueAbandonedCartGrantIfNeeded(
          dataClient,
          userId,
          userId,
        );
      } catch (err) {
        console.error("Abandoned cart grant failed", err);
      }
    }
  }

  if (!incomingHasItems) {
    const revoked = await revokeOpenAbandonedCartGrants(dataClient, userId);
    grantsRevoked = revoked > 0;
    if (previous) {
      await dataClient.models.CartSnapshot.delete({ userId });
    }
    return { synced: true, grantIssued, grantsRevoked };
  }

  const payload = {
    userId,
    lineItems: lineItemsJsonFromSnapshot(lineItems),
    updatedAt: linesChanged ? now : (previous?.updatedAt ?? now),
    abandonedAt: grantIssued ? now : (previous?.abandonedAt ?? null),
  };

  if (previous) {
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

  return { synced: true, grantIssued, grantsRevoked };
}

/** Guest carts: snapshot + counts only. Promo grants wait for sign-in merge (M6). */
async function syncGuestCart(
  guestId: string,
  lineItems: CartSnapshotLine[],
): Promise<SyncResult> {
  const now = new Date().toISOString();

  const existing = await dataClient.models.GuestCartSnapshot.get({ guestId });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  const incomingHasItems = snapshotHasItems(lineItems);
  const previous = existing.data;
  const previousLines = parseLineItems(previous?.lineItems);
  const previousProductIds = productIdsInCartLines(previousLines);
  const nextProductIds = productIdsInCartLines(lineItems);
  const linesChanged =
    !previous ||
    snapshotSignature(previousLines) !== snapshotSignature(lineItems);

  try {
    await applyProductCartCountDelta(
      dataClient,
      previousProductIds,
      nextProductIds,
    );
  } catch (err) {
    console.error("Product cart count update failed", err);
  }

  if (!incomingHasItems) {
    if (previous) {
      await dataClient.models.GuestCartSnapshot.delete({ guestId });
    }
    return { synced: true, grantIssued: false, grantsRevoked: false };
  }

  const payload = {
    guestId,
    lineItems: lineItemsJsonFromSnapshot(lineItems),
    updatedAt: linesChanged ? now : (previous?.updatedAt ?? now),
    abandonedAt: previous?.abandonedAt ?? null,
  };

  if (previous) {
    const updateResult =
      await dataClient.models.GuestCartSnapshot.update(payload);
    if (updateResult.errors?.length) {
      throw new Error(updateResult.errors.map((e) => e.message).join("; "));
    }
  } else {
    const createResult =
      await dataClient.models.GuestCartSnapshot.create(payload);
    if (createResult.errors?.length) {
      throw new Error(createResult.errors.map((e) => e.message).join("; "));
    }
  }

  return { synced: true, grantIssued: false, grantsRevoked: false };
}

export const handler = async (event: {
  fieldName?: string;
  info?: { fieldName?: string };
  identity?: { sub?: string } | null;
  arguments: {
    lineItems?: Array<CartSnapshotLine | null> | null;
    guestId?: string | null;
    guestToken?: string | null;
  };
}) => {
  const fieldName = event.fieldName ?? event.info?.fieldName ?? "";
  if (fieldName === "getGuestCartSnapshot") {
    const guestId = event.arguments.guestId?.trim() ?? "";
    const guestToken = event.arguments.guestToken?.trim() ?? "";
    if (!(await verifyGuestToken(guestId, guestToken))) {
      throw new Error("Invalid or missing guest session.");
    }
    const existing = await dataClient.models.GuestCartSnapshot.get({ guestId });
    if (existing.errors?.length) {
      throw new Error(existing.errors.map((e) => e.message).join("; "));
    }
    const previous = existing.data;
    if (!previous) {
      return { found: false, lineItems: [] };
    }
    return {
      found: true,
      lineItems: parseLineItems(previous.lineItems),
      updatedAt: previous.updatedAt ?? undefined,
    };
  }

  const lineItems = normalizeLineItems(
    (event.arguments.lineItems ?? []).filter(
      (row): row is CartSnapshotLine => row != null,
    ),
  );

  const userId =
    event.identity && "sub" in event.identity
      ? (event.identity.sub as string | undefined)
      : undefined;

  if (userId) {
    return syncUserCart(userId, lineItems);
  }

  const guestId = event.arguments.guestId?.trim() ?? "";
  const guestToken = event.arguments.guestToken?.trim() ?? "";
  if (!(await verifyGuestToken(guestId, guestToken))) {
    throw new Error("Invalid or missing guest session.");
  }

  return syncGuestCart(guestId, lineItems);
};
