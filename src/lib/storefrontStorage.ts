/**
 * Public catalog assets under `products/*`.
 *
 * Why not default `getUrl()`?
 * - AppSync catalog uses **userPool** when signed in (see getGuestDataClient).
 * - S3 uses the **identity pool IAM role**, which for shoppers is the **customer**
 *   group role — not "authenticated" and not guest.
 * - Storage historically granted only guest + admin on `products/*`, so signed-in
 *   customers saw products but broken images.
 *
 * Rule: any storefront read of `products/*` must go through getPublicCatalogImageUrl().
 * Admin writes still use uploadData() with the admin group role.
 *
 * @see docs/storage-auth.md
 */
import { getUrl, type GetUrlWithPathInput } from "aws-amplify/storage";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import outputs from "../../amplify_outputs.json";
import { configureAmplify } from "@/lib/amplify";

type GuestCredentialsProvider = (options?: {
  forceRefresh?: boolean;
}) => Promise<{
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration?: Date;
  };
}>;

let guestCredentialsProvider: GuestCredentialsProvider | undefined;

function getGuestCredentialsProvider(): GuestCredentialsProvider {
  if (guestCredentialsProvider !== undefined && guestCredentialsProvider) {
    return guestCredentialsProvider;
  }

  const identityPoolId = outputs.auth?.identity_pool_id;
  const region = outputs.auth?.aws_region;
  if (!identityPoolId || !region) {
    throw new Error(
      "amplify_outputs.json is missing auth.identity_pool_id or auth.aws_region — cannot resolve catalog images",
    );
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

/** Presigned GET URL for a public catalog object; always uses guest IAM. */
export async function getPublicCatalogImageUrl(path: string): Promise<URL> {
  await configureAmplify();
  const locationCredentialsProvider = getGuestCredentialsProvider();
  const input = {
    path,
    options: { locationCredentialsProvider },
  } as GetUrlWithPathInput;
  const { url } = await getUrl(input);
  return url;
}
