import { getCustomerDataClient, getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasVaultAccessModel, requireVaultAccessModel } from "@/lib/dataModels";
import {
  clearVaultUnlocked,
  getVaultSession,
  type VaultSession,
} from "@/lib/vaultSession";
import { tryAutoUnlockVaultForSignedInUser } from "@/lib/vaultUnlock";

export type VaultEntryStatus = "unlocked" | "locked" | "denied";

async function verifySessionWithServer(session: VaultSession): Promise<boolean> {
  const client = await getGuestDataClient();
  if (!client || !hasVaultAccessModel(client)) return false;

  try {
    const VaultAccess = requireVaultAccessModel(client);
    const { data, errors } = await VaultAccess.get({
      accessKey: session.accessKey,
    });
    if (errors?.length) return false;
    if (!data?.active || data.userId !== session.userId) return false;

    const customerClient = await getCustomerDataClient();
    if (customerClient) {
      const { getCurrentUser } = await import("aws-amplify/auth");
      const { userId } = await getCurrentUser();
      if (userId !== session.userId) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** True when the signed-in customer has an active vault grant in the database. */
export async function userHasActiveVaultGrant(): Promise<boolean> {
  const client = await getCustomerDataClient();
  if (!client || !hasVaultAccessModel(client)) return false;

  try {
    const { getCurrentUser } = await import("aws-amplify/auth");
    const { userId } = await getCurrentUser();
    const VaultAccess = requireVaultAccessModel(client);
    const { data, errors } = await VaultAccess.list({
      filter: { userId: { eq: userId }, active: { eq: true } },
    });
    if (errors?.length) return false;
    return Boolean(data?.length);
  } catch {
    return false;
  }
}

/** Confirms the browser session still matches an active vault grant (API check). */
export async function validateVaultSession(): Promise<boolean> {
  const session = getVaultSession();
  if (!session) return false;
  const valid = await verifySessionWithServer(session);
  if (!valid) clearVaultUnlocked();
  return valid;
}

/**
 * Whether the visitor may enter the vault.
 * - unlocked: valid session (verified with API)
 * - locked: may enter a key (guest, or account with grant but no session yet)
 * - denied: no grant or access was revoked — send to shop
 */
export async function resolveVaultEntry(): Promise<VaultEntryStatus> {
  const session = getVaultSession();
  if (session) {
    if (await verifySessionWithServer(session)) return "unlocked";
    clearVaultUnlocked();
    return "denied";
  }

  if (await tryAutoUnlockVaultForSignedInUser()) return "unlocked";

  const customerClient = await getCustomerDataClient();
  if (customerClient) {
    const hasGrant = await userHasActiveVaultGrant();
    return hasGrant ? "locked" : "denied";
  }

  return "locked";
}
