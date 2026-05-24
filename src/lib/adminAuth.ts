import { configureAmplify } from "@/lib/amplify";

/** Clear Cognito session (local or global). */
export async function adminSignOut(global = true): Promise<void> {
  await configureAmplify();
  const { signOut } = await import("aws-amplify/auth");
  await signOut({ global });
}

/** True when the user has a valid Cognito session. */
export async function hasAdminSession(): Promise<boolean> {
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
