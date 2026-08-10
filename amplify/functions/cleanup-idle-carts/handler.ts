import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import {
  applyProductCartCountDelta,
  productIdsInCartLines,
} from "../cart-shared/productCartCounts.js";
import { parseLineItems } from "../cart-shared/snapshotLines.js";
import { revokeOpenAbandonedCartGrants } from "../promo-shared/grantIssuance.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

const CATALOG_SETTINGS_KEY = "store";
const DEFAULT_IDLE_DAYS = 90;

type CartCleanupScope = "guest" | "signed_in" | "both";

type CleanupResult = {
  ran: boolean;
  skipped: boolean;
  guestDeleted: number;
  signedInDeleted: number;
  grantsRevoked: number;
  message: string;
};

type CleanupOptions = {
  idleDays: number;
  scope: CartCleanupScope;
  /** When true (scheduled run), honor cartCleanupEnabled. Manual admin runs always proceed. */
  requireEnabled: boolean;
};

function isScheduledEvent(event: unknown): boolean {
  return (
    typeof event === "object" &&
    event !== null &&
    "source" in event &&
    (event as { source?: string }).source === "aws.events"
  );
}

function normalizeScope(raw: string | null | undefined): CartCleanupScope {
  if (raw === "guest" || raw === "signed_in" || raw === "both") return raw;
  return "guest";
}

function normalizeIdleDays(raw: number | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 1) {
    return Math.min(Math.floor(raw), 3650);
  }
  return DEFAULT_IDLE_DAYS;
}

async function loadSettings(): Promise<{
  enabled: boolean;
  idleDays: number;
  scope: CartCleanupScope;
}> {
  const { data, errors } = await dataClient.models.CatalogSettings.get({
    settingsKey: CATALOG_SETTINGS_KEY,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return {
    enabled: data?.cartCleanupEnabled === true,
    idleDays: normalizeIdleDays(data?.cartCleanupIdleDays ?? undefined),
    scope: normalizeScope(data?.cartCleanupScope ?? undefined),
  };
}

async function listAllRows<T>(
  list: (args: {
    limit?: number;
    nextToken?: string;
  }) => Promise<{
    data: (T | null)[] | null | undefined;
    nextToken?: string | null;
    errors?: { message: string }[] | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  let nextToken: string | undefined;
  do {
    const result = await list({ limit: 100, nextToken });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
    for (const row of result.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = result.nextToken ?? undefined;
  } while (nextToken);
  return rows;
}

function isIdle(updatedAt: string | null | undefined, cutoffMs: number): boolean {
  if (!updatedAt) return true;
  const ms = Date.parse(updatedAt);
  if (!Number.isFinite(ms)) return true;
  return ms < cutoffMs;
}

async function deleteGuestSnapshot(
  row: Schema["GuestCartSnapshot"]["type"],
): Promise<void> {
  const lines = parseLineItems(row.lineItems);
  try {
    await applyProductCartCountDelta(
      dataClient,
      productIdsInCartLines(lines),
      new Set(),
    );
  } catch (err) {
    console.error("Guest cart count adjust failed", row.guestId, err);
  }
  const { errors } = await dataClient.models.GuestCartSnapshot.delete({
    guestId: row.guestId,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

async function deleteUserSnapshot(
  row: Schema["CartSnapshot"]["type"],
): Promise<number> {
  const lines = parseLineItems(row.lineItems);
  try {
    await applyProductCartCountDelta(
      dataClient,
      productIdsInCartLines(lines),
      new Set(),
    );
  } catch (err) {
    console.error("Signed-in cart count adjust failed", row.userId, err);
  }

  let revoked = 0;
  try {
    revoked = await revokeOpenAbandonedCartGrants(dataClient, row.userId);
  } catch (err) {
    console.error("Abandon grant revoke failed", row.userId, err);
  }

  const { errors } = await dataClient.models.CartSnapshot.delete({
    userId: row.userId,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return revoked;
}

async function runCleanup(options: CleanupOptions): Promise<CleanupResult> {
  if (options.requireEnabled) {
    const settings = await loadSettings();
    if (!settings.enabled) {
      return {
        ran: false,
        skipped: true,
        guestDeleted: 0,
        signedInDeleted: 0,
        grantsRevoked: 0,
        message: "Idle cart cleanup is disabled in Settings.",
      };
    }
  }

  const idleDays = normalizeIdleDays(options.idleDays);
  const scope = normalizeScope(options.scope);
  const cutoffMs = Date.now() - idleDays * 24 * 60 * 60 * 1000;

  let guestDeleted = 0;
  let signedInDeleted = 0;
  let grantsRevoked = 0;

  if (scope === "guest" || scope === "both") {
    const guests = await listAllRows((args) =>
      dataClient.models.GuestCartSnapshot.list(args),
    );
    for (const row of guests) {
      if (!isIdle(row.updatedAt, cutoffMs)) continue;
      await deleteGuestSnapshot(row);
      guestDeleted += 1;
    }
  }

  if (scope === "signed_in" || scope === "both") {
    const users = await listAllRows((args) =>
      dataClient.models.CartSnapshot.list(args),
    );
    for (const row of users) {
      if (!isIdle(row.updatedAt, cutoffMs)) continue;
      grantsRevoked += await deleteUserSnapshot(row);
      signedInDeleted += 1;
    }
  }

  return {
    ran: true,
    skipped: false,
    guestDeleted,
    signedInDeleted,
    grantsRevoked,
    message: `Deleted ${guestDeleted} guest and ${signedInDeleted} signed-in cart(s) idle ≥ ${idleDays} day(s) (scope: ${scope}).`,
  };
}

export const handler = async (event: unknown): Promise<CleanupResult | void> => {
  if (isScheduledEvent(event)) {
    const settings = await loadSettings();
    const result = await runCleanup({
      idleDays: settings.idleDays,
      scope: settings.scope,
      requireEnabled: true,
    });
    console.log("Scheduled idle cart cleanup", result);
    return;
  }

  const appsync = event as {
    arguments?: {
      idleDays?: number | null;
      scope?: string | null;
    };
  };

  const settings = await loadSettings();
  const idleDays =
    appsync.arguments?.idleDays != null
      ? normalizeIdleDays(appsync.arguments.idleDays)
      : settings.idleDays;
  const scope =
    appsync.arguments?.scope != null
      ? normalizeScope(appsync.arguments.scope)
      : settings.scope;

  return runCleanup({
    idleDays,
    scope,
    requireEnabled: false,
  });
};
