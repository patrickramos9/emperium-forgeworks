import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});

function emailFromAttributes(
  attrs?: { Name?: string; Value?: string }[] | null,
): string | undefined {
  return attrs?.find((a) => a.Name === "email")?.Value?.trim() || undefined;
}

/**
 * Prefer a stored contact email; fall back to Cognito for signed-in users.
 *
 * Important: Amplify `getCurrentUser().userId` / Conversation.userId is Cognito
 * `sub`, but this pool signs up with **email as Username**. AdminGetUser(sub)
 * therefore fails — we ListUsers by `sub` as a fallback.
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

  // 1) Username may equal userId (UUID username pools) or be an email.
  try {
    const result = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: userId,
      }),
    );
    const email = emailFromAttributes(result.UserAttributes);
    if (email) return email;
  } catch {
    // Expected when userId is `sub` but Cognito Username is the email.
  }

  // 2) Resolve by Cognito `sub` (owner claim used across Orders / Conversations).
  try {
    const safeSub = userId.replace(/"/g, "");
    const listed = await cognito.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `sub = "${safeSub}"`,
        Limit: 1,
      }),
    );
    const email = emailFromAttributes(listed.Users?.[0]?.Attributes);
    if (email) return email;
  } catch (err) {
    console.error("Cognito ListUsers contact email lookup failed", err);
  }

  return undefined;
}

/** @deprecated Prefer resolveContactEmail */
export const resolvePrintRequestContactEmail = resolveContactEmail;
