import { configureAmplify } from "@/lib/amplify";

/** Matches Cognito password policy in amplify auth config. */
export function validateCustomerPassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return null;
}

export function isAlreadySignedInError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  const message = err instanceof Error ? err.message : "";
  return (
    name === "UserAlreadyAuthenticatedException" ||
    message.toLowerCase().includes("already a signed in user") ||
    message.toLowerCase().includes("already signed in")
  );
}

/** True when the user has a valid Cognito session. */
export async function hasCustomerSession(): Promise<boolean> {
  const ok = await configureAmplify();
  if (!ok) return false;

  try {
    const { getCurrentUser, fetchAuthSession } = await import("aws-amplify/auth");
    await getCurrentUser();
    const session = await fetchAuthSession();
    return Boolean(session.tokens?.accessToken);
  } catch {
    return false;
  }
}

/** Cognito `sub` for the signed-in user, or null. */
export async function getCustomerUserId(): Promise<string | null> {
  const ok = await configureAmplify();
  if (!ok) return null;

  try {
    const { getCurrentUser } = await import("aws-amplify/auth");
    const user = await getCurrentUser();
    return user.userId;
  } catch {
    return null;
  }
}

export async function getCustomerEmail(): Promise<string | null> {
  const ok = await configureAmplify();
  if (!ok) return null;

  try {
    const { fetchUserAttributes } = await import("aws-amplify/auth");
    const attrs = await fetchUserAttributes();
    return attrs.email ?? null;
  } catch {
    return null;
  }
}

/** Clear Cognito session (local or global). */
export async function customerSignOut(global = true): Promise<void> {
  await configureAmplify();
  const { signOut } = await import("aws-amplify/auth");
  await signOut({ global });
}
