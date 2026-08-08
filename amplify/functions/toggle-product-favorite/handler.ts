import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import { issueFavoriteGrantIfNeeded } from "../promo-shared/grantIssuance.js";
import { adjustProductFavoriteCount } from "../favorite-shared/productFavoriteCounts.js";
import { verifyGuestToken } from "../guest-shared/cookie.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

type AppSyncEvent = {
  /** Amplify @function VTL puts fieldName at top level (not event.info). */
  fieldName?: string;
  typeName?: string;
  info?: { fieldName?: string };
  identity?: { sub?: string } | null;
  arguments: {
    productId?: string;
    productSlug?: string | null;
    favorited?: boolean;
    guestId?: string | null;
    guestToken?: string | null;
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

async function listGuestFavoriteRows(guestId: string) {
  const GuestFavorite = dataClient.models.GuestFavorite;
  if (!GuestFavorite) {
    throw new Error("Guest favorites are not deployed yet.");
  }

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

async function handleListGuestFavorites(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const favorites = await listGuestFavoriteRows(guestId);
  return { favorites };
}

async function toggleUserFavorite(
  userId: string,
  productId: string,
  productSlug: string | undefined,
  favorited: boolean,
) {
  if (favorited) {
    const existing = await dataClient.models.Favorite.get({
      userId,
      productId,
    });
    if (!existing.data) {
      const createResult = await dataClient.models.Favorite.create({
        userId,
        productId,
        ...(productSlug ? { productSlug } : {}),
      });
      if (createResult.errors?.length) {
        throw new Error(createResult.errors.map((e) => e.message).join("; "));
      }
      await adjustProductFavoriteCount(dataClient, productId, 1);
    }

    let grantIssued = false;
    try {
      grantIssued = await issueFavoriteGrantIfNeeded(
        dataClient,
        userId,
        productId,
      );
    } catch (err) {
      console.error("Favorite promo grant failed", err);
    }

    return { favorited: true, grantIssued };
  }

  const deleteResult = await dataClient.models.Favorite.delete({
    userId,
    productId,
  });
  if (deleteResult.errors?.length) {
    throw new Error(deleteResult.errors.map((e) => e.message).join("; "));
  }

  await adjustProductFavoriteCount(dataClient, productId, -1);
  return { favorited: false, grantIssued: false };
}

async function toggleGuestFavorite(
  guestId: string,
  productId: string,
  productSlug: string | undefined,
  favorited: boolean,
) {
  const GuestFavorite = dataClient.models.GuestFavorite;
  if (!GuestFavorite) {
    throw new Error("Guest favorites are not deployed yet.");
  }

  if (favorited) {
    const existing = await GuestFavorite.get({ guestId, productId });
    if (!existing.data) {
      const createResult = await GuestFavorite.create({
        guestId,
        productId,
        ...(productSlug ? { productSlug } : {}),
      });
      if (createResult.errors?.length) {
        throw new Error(createResult.errors.map((e) => e.message).join("; "));
      }
      await adjustProductFavoriteCount(dataClient, productId, 1);
    }
    // Promo grants stay account-bound (M6) — issued on sign-in merge.
    return { favorited: true, grantIssued: false };
  }

  const deleteResult = await GuestFavorite.delete({ guestId, productId });
  if (deleteResult.errors?.length) {
    throw new Error(deleteResult.errors.map((e) => e.message).join("; "));
  }

  await adjustProductFavoriteCount(dataClient, productId, -1);
  return { favorited: false, grantIssued: false };
}

async function handleToggle(event: AppSyncEvent) {
  const productId = event.arguments.productId?.trim();
  if (!productId) {
    throw new Error("productId is required.");
  }
  const productSlug = event.arguments.productSlug?.trim() || undefined;
  const favorited = Boolean(event.arguments.favorited);

  const userId =
    event.identity && "sub" in event.identity
      ? (event.identity.sub as string | undefined)
      : undefined;

  if (userId) {
    return toggleUserFavorite(userId, productId, productSlug, favorited);
  }

  const guestId = await requireGuestId(event);
  return toggleGuestFavorite(guestId, productId, productSlug, favorited);
}

export const handler = async (event: AppSyncEvent) => {
  const fieldName = resolveFieldName(event);
  if (fieldName === "getGuestFavorites") {
    return handleListGuestFavorites(event);
  }
  // Toggle when productId is present (covers missing fieldName edge cases).
  if (event.arguments.productId) {
    return handleToggle(event);
  }
  if (
    event.arguments.guestId &&
    event.arguments.guestToken &&
    event.arguments.favorited === undefined
  ) {
    return handleListGuestFavorites(event);
  }
  return handleToggle(event);
};
