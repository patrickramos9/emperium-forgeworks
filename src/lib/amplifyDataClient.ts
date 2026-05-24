import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { configureAmplify } from "@/lib/amplify";
import { adminSignOut } from "@/lib/adminAuth";

export type AmplifyDataClient = ReturnType<typeof generateClient<Schema>>;

/** Guest reads (e.g. storefront catalog). Uses IAM when anonymous; userPool when signed in (e.g. admin). */
export async function getGuestDataClient(): Promise<AmplifyDataClient | null> {
  const ok = await configureAmplify();
  if (!ok) return null;

  const { fetchAuthSession, getCurrentUser } = await import("aws-amplify/auth");

  try {
    await getCurrentUser();
    await fetchAuthSession();
    return generateClient<Schema>({ authMode: "userPool" });
  } catch {
    try {
      await fetchAuthSession();
    } catch {
      /* unauthenticated identity pool credentials may still be issued on data calls */
    }
    return generateClient<Schema>({ authMode: "iam" });
  }
}

/** Admin CRUD — requires signed-in user in the `admin` Cognito group. */
export async function getAdminDataClient(): Promise<AmplifyDataClient | null> {
  const ok = await configureAmplify();
  if (!ok) return null;
  return generateClient<Schema>({ authMode: "userPool" });
}

/** Ensures the user is signed in; redirects to login when not. */
export async function requireAdminSession(
  navigate: (path: string) => void,
): Promise<AmplifyDataClient | null> {
  const client = await getAdminDataClient();
  if (!client) {
    navigate("/admin/login");
    return null;
  }

  try {
    const { getCurrentUser, fetchAuthSession } = await import("aws-amplify/auth");
    await getCurrentUser();
    const session = await fetchAuthSession();
    if (!session.tokens?.accessToken) {
      await adminSignOut(false);
      navigate("/admin/login");
      return null;
    }
    return client;
  } catch {
    navigate("/admin/login");
    return null;
  }
}
