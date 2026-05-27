import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import outputs from "../../amplify_outputs.json";

export type GuestStorageCredentialsProvider = (options?: {
  forceRefresh?: boolean;
}) => Promise<{
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration?: Date;
  };
}>;

let guestCredentialsProvider: GuestStorageCredentialsProvider | null | undefined;

/**
 * IAM credentials for the identity pool's unauthenticated (guest) role.
 * Used for public catalog images so signed-in customers (customer group role)
 * are not blocked when storage only grants guest read until backend redeploy.
 */
export function getGuestStorageCredentialsProvider():
  | GuestStorageCredentialsProvider
  | undefined {
  if (guestCredentialsProvider !== undefined) {
    return guestCredentialsProvider ?? undefined;
  }

  const identityPoolId = outputs.auth?.identity_pool_id;
  const region = outputs.auth?.aws_region;
  if (!identityPoolId || !region) {
    guestCredentialsProvider = null;
    return undefined;
  }

  const provider = fromCognitoIdentityPool({
    clientConfig: { region },
    identityPoolId,
  });

  guestCredentialsProvider = async () => {
    const credentials = await provider();
    if (
      !credentials.accessKeyId ||
      !credentials.secretAccessKey ||
      !credentials.sessionToken
    ) {
      throw new Error("Guest storage credentials are incomplete");
    }
    return {
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
        expiration: credentials.expiration,
      },
    };
  };

  return guestCredentialsProvider;
}
