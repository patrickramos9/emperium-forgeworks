import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import {
  ensureGuestSession,
  getStoredGuestSession,
} from "@/services/guestSessionService";

export type MergeGuestIdentityResult = {
  merged: boolean;
  guestId: string;
  userId: string;
  cartsMerged: number;
  favoritesMerged: number;
  printRequestsMerged: number;
  notificationsMerged: number;
};

/**
 * M6e — after sign-in/register, attach verified guest identity to the Cognito user.
 * Foundation: verifies token; row merges land when models support guestId.
 */
export async function mergeGuestIdentityOnSignIn(): Promise<MergeGuestIdentityResult | null> {
  let session = getStoredGuestSession();
  if (!session) {
    try {
      const ensured = await ensureGuestSession();
      if (ensured) {
        session = {
          guestId: ensured.guestId,
          guestToken: ensured.guestToken,
        };
      }
    } catch (err) {
      console.error("Guest session before merge failed", err);
      return null;
    }
  }

  if (!session) return null;

  const client = await getCustomerDataClient();
  if (!client?.mutations.mergeGuestIdentity) {
    return null;
  }

  const { data, errors } = await client.mutations.mergeGuestIdentity({
    guestId: session.guestId,
    guestToken: session.guestToken,
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  if (!data) return null;

  return {
    merged: data.merged,
    guestId: data.guestId,
    userId: data.userId,
    cartsMerged: data.cartsMerged,
    favoritesMerged: data.favoritesMerged,
    printRequestsMerged: data.printRequestsMerged,
    notificationsMerged: data.notificationsMerged ?? 0,
  };
}
