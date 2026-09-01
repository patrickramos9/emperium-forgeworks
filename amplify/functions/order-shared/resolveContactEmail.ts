import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});

/**
 * Prefer a stored contact email; fall back to Cognito for signed-in users.
 * Admin UI often shows Cognito email while Dynamo rows only have userId.
 */
export async function resolveContactEmail(input: {
  email?: string | null;
  userId?: string | null;
}): Promise<string | undefined> {
  const stored = input.email?.trim();
  if (stored) return stored;

  const userId = input.userId?.trim();
  if (!userId) return undefined;

  const userPoolId = process.env.USER_POOL_ID?.trim();
  if (!userPoolId) {
    console.warn(
      "Contact email lookup skipped — USER_POOL_ID not set on Lambda.",
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
    const email = result.UserAttributes?.find(
      (a) => a.Name === "email",
    )?.Value?.trim();
    return email || undefined;
  } catch (err) {
    console.error("Cognito contact email lookup failed", err);
    return undefined;
  }
}

/** @deprecated Prefer resolveContactEmail */
export const resolvePrintRequestContactEmail = resolveContactEmail;
