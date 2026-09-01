import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});

/**
 * Contact email for print quote/decline mail.
 * Guests: stored on PrintRequest.email.
 * Accounts: often Cognito-only — look up when the row has no email.
 */
export async function resolvePrintRequestContactEmail(request: {
  email?: string | null;
  userId?: string | null;
}): Promise<string | undefined> {
  const stored = request.email?.trim();
  if (stored) return stored;

  const userId = request.userId?.trim();
  if (!userId) return undefined;

  const userPoolId = process.env.USER_POOL_ID?.trim();
  if (!userPoolId) {
    console.warn(
      "Print email skipped for account request — USER_POOL_ID not set on Lambda.",
    );
    return undefined;
  }

  try {
    const result = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: userId,
      }),
    );
    const email = result.UserAttributes?.find((a) => a.Name === "email")?.Value?.trim();
    return email || undefined;
  } catch (err) {
    console.error("Cognito email lookup failed for print request", err);
    return undefined;
  }
}
