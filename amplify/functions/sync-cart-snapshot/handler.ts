import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
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

function parseLineItems(
  raw: unknown,
): Schema["CartSnapshotLine"]["type"][] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (row): row is Schema["CartSnapshotLine"]["type"] =>
        row != null && typeof row === "object" && "quantity" in row,
    );
  }
  if (typeof raw === "string") {
    try {
      return parseLineItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

function snapshotHasItems(
  lineItems: Schema["CartSnapshotLine"]["type"][] | null | undefined,
): boolean {
  return (lineItems ?? []).some((row) => row && row.quantity > 0);
}

/** Stable signature — slug/qty/price only so catalog id sync does not reset idle time. */
function snapshotSignature(
  lineItems: Schema["CartSnapshotLine"]["type"][],
): string {
  return JSON.stringify(
    lineItems
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        slug: row.slug ?? row.productId,
        quantity: row.quantity,
        priceCents: row.priceCents,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
  );
}

export const handler: Schema["syncCartSnapshot"]["functionHandler"] = async (
  event,
) => {
  const userId =
    event.identity && "sub" in event.identity
      ? (event.identity.sub as string | undefined)
      : undefined;
  if (!userId) {
    throw new Error("Sign in to sync cart.");
  }

  const lineItems = (event.arguments.lineItems ?? []).filter(
    (row): row is Schema["CartSnapshotLine"]["type"] => row != null,
  );
  const now = new Date().toISOString();
  const nowMs = Date.now();
  let grantIssued = false;

  const existing = await dataClient.models.CartSnapshot.get({ userId });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  const incomingHasItems = snapshotHasItems(lineItems);
  const previous = existing.data;

  const previousLines = parseLineItems(previous?.lineItems);
  const linesChanged =
    !previous ||
    snapshotSignature(previousLines) !== snapshotSignature(lineItems);

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
    if (previous) {
      await dataClient.models.CartSnapshot.delete({ userId });
    }
    return { synced: true, grantIssued };
  }

  const payload = {
    userId,
    lineItems,
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

  return { synced: true, grantIssued };
};
