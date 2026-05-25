import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { configureAmplify } from "@/lib/amplify";
import { adminSignOut, isAdminUser } from "@/lib/adminAuth";
import {
  isAdminIdleExpired,
  touchAdminActivity,
} from "@/lib/adminSessionPolicy";

export type AmplifyDataClient = ReturnType<typeof generateClient<Schema>>;

/**
 * Storefront catalog + guest order writes.
 * - Signed out: IAM (guest rules).
 * - Signed in: userPool (authenticated read on Product; admin group retains CRUD).
 *   Using IAM while signed in can map to the wrong identity-pool role and return no rows.
 */
export async function getGuestDataClient(): Promise<AmplifyDataClient | null> {
  const ok = await configureAmplify();
  if (!ok) return null;

  const { fetchAuthSession, getCurrentUser } = await import("aws-amplify/auth");

  try {
    await getCurrentUser();
    const session = await fetchAuthSession();
    if (session.tokens?.accessToken) {
      return generateClient<Schema>({ authMode: "userPool" });
    }
  } catch {
    /* not signed in — use guest IAM below */
  }

  try {
    await fetchAuthSession();
  } catch {
    /* unauthenticated identity pool credentials may still be issued on data calls */
  }

  return generateClient<Schema>({ authMode: "iam" });
}

/** Admin CRUD — requires signed-in user in the `admin` Cognito group. */
export async function getAdminDataClient(): Promise<AmplifyDataClient | null> {
  const ok = await configureAmplify();
  if (!ok) return null;

  if (!(await isAdminUser())) {
    return null;
  }

  return generateClient<Schema>({ authMode: "userPool" });
}

/** Customer reads (e.g. order history) — requires signed-in user. */
export async function getCustomerDataClient(): Promise<AmplifyDataClient | null> {
  const ok = await configureAmplify();
  if (!ok) return null;

  try {
    const { getCurrentUser, fetchAuthSession } = await import("aws-amplify/auth");
    await getCurrentUser();
    const session = await fetchAuthSession();
    if (!session.tokens?.accessToken) return null;
    return generateClient<Schema>({ authMode: "userPool" });
  } catch {
    return null;
  }
}

/** Ensures the user is signed in; redirects to login when not. */
export async function requireCustomerSession(
  navigate: (path: string) => void,
  returnTo?: string,
): Promise<AmplifyDataClient | null> {
  const client = await getCustomerDataClient();
  if (!client) {
    const next = returnTo
      ? `/account/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/account/login";
    navigate(next);
    return null;
  }
  return client;
}

/** Ensures the user is in the `admin` group; redirects to login when not. */
export async function requireAdminSession(
  navigate: (path: string) => void,
): Promise<AmplifyDataClient | null> {
  const ok = await configureAmplify();
  if (!ok) {
    navigate("/admin/login");
    return null;
  }

  try {
    const { getCurrentUser, fetchAuthSession } = await import("aws-amplify/auth");
    await getCurrentUser();
    const session = await fetchAuthSession();
    if (!session.tokens?.accessToken) {
      navigate("/admin/login");
      return null;
    }

    if (isAdminIdleExpired()) {
      await adminSignOut(false);
      navigate("/admin/login?error=session_expired");
      return null;
    }

    if (!(await isAdminUser())) {
      await adminSignOut(false);
      navigate("/admin/login?error=not_admin");
      return null;
    }

    touchAdminActivity();
    return generateClient<Schema>({ authMode: "userPool" });
  } catch {
    navigate("/admin/login");
    return null;
  }
}
