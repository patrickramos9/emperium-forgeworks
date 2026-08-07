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

/**
 * M6e foundation — verify guest token + Cognito sub; merge is a no-op until
 * CartSnapshot / Favorite / PrintRequest gain guestId ownership.
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

  // Foundation stub — identity verified. Use dataClient when guest-owned rows exist.
  void dataClient;

  return {
    merged: true,
    guestId,
    userId,
    cartsMerged: 0,
    favoritesMerged: 0,
    printRequestsMerged: 0,
  };
};
