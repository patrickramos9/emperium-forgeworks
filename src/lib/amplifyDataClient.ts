import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { configureAmplify } from "@/lib/amplify";

export type AmplifyDataClient = ReturnType<typeof generateClient<Schema>>;

/** Guest reads (e.g. storefront catalog). */
export async function getGuestDataClient(): Promise<AmplifyDataClient | null> {
  const ok = await configureAmplify();
  if (!ok) return null;
  return generateClient<Schema>();
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
    const { getCurrentUser } = await import("aws-amplify/auth");
    await getCurrentUser();
    return client;
  } catch {
    navigate("/admin/login");
    return null;
  }
}
