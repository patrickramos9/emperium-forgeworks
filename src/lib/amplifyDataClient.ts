import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { configureAmplify } from "@/lib/amplify";
import { adminSignOut, isAdminUser } from "@/lib/adminAuth";

export type AmplifyDataClient = ReturnType<typeof generateClient<Schema>>;

/**
 * Storefront catalog reads — always IAM (guest rule on Product).
 * Do not switch to userPool when a customer is signed in; they are not in `admin`.
 */
export async function getGuestDataClient(): Promise<AmplifyDataClient | null> {
  const ok = await configureAmplify();
  if (!ok) return null;

  const { fetchAuthSession } = await import("aws-amplify/auth");
  try {
    await fetchAuthSession();
  } catch {
    /* identity pool credentials may still be issued on data calls */
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

    if (!(await isAdminUser())) {
      await adminSignOut(false);
      navigate("/admin/login?error=not_admin");
      return null;
    }

    return generateClient<Schema>({ authMode: "userPool" });
  } catch {
    navigate("/admin/login");
    return null;
  }
}
