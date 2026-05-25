import { configureAmplify } from "@/lib/amplify";

const ADMIN_GROUP = "admin";

/** Cognito group names on the current access token. */
export async function getCognitoGroups(): Promise<string[]> {
  const ok = await configureAmplify();
  if (!ok) return [];

  try {
    const { fetchAuthSession } = await import("aws-amplify/auth");
    const session = await fetchAuthSession();
    const groups = session.tokens?.accessToken?.payload["cognito:groups"];
    if (Array.isArray(groups)) {
      return groups.filter((g): g is string => typeof g === "string");
    }
    if (typeof groups === "string") {
      return [groups];
    }
    return [];
  } catch {
    return [];
  }
}

/** True when the signed-in user is in the `admin` Cognito group. */
export async function isAdminUser(): Promise<boolean> {
  const groups = await getCognitoGroups();
  return groups.includes(ADMIN_GROUP);
}

/** Clear Cognito session (local or global). */
export async function adminSignOut(global = true): Promise<void> {
  await configureAmplify();
  const { signOut } = await import("aws-amplify/auth");
  await signOut({ global });
}

/** True when the user has a valid session in the `admin` group. */
export async function hasAdminSession(): Promise<boolean> {
  const ok = await configureAmplify();
  if (!ok) return false;

  try {
    const { getCurrentUser, fetchAuthSession } = await import("aws-amplify/auth");
    await getCurrentUser();
    const session = await fetchAuthSession();
    if (!session.tokens?.accessToken) return false;
    return isAdminUser();
  } catch {
    return false;
  }
}

export { isAlreadySignedInError } from "@/lib/customerAuth";
