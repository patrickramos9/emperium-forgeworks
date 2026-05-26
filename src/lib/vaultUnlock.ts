import { getCustomerDataClient, getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasVaultAccessModel, requireVaultAccessModel } from "@/lib/dataModels";
import {
  normalizeVaultAccessKey,
  validateVaultAccessKey,
} from "@/lib/vaultKey";
import { setVaultUnlocked } from "@/lib/vaultSession";

const FAIL_KEY = "emperium-vault-failures";
const MAX_CLIENT_FAILURES = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

function getFailureState(): { count: number; lockedUntil: number } {
  try {
    const raw = sessionStorage.getItem(FAIL_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw) as { count: number; lockedUntil: number };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function recordFailure(): void {
  const state = getFailureState();
  const count = state.count + 1;
  const lockedUntil =
    count >= MAX_CLIENT_FAILURES ? Date.now() + LOCKOUT_MS : state.lockedUntil;
  sessionStorage.setItem(FAIL_KEY, JSON.stringify({ count, lockedUntil }));
}

function clearFailures(): void {
  sessionStorage.removeItem(FAIL_KEY);
}

export function isVaultUnlockLockedOut(): boolean {
  const { lockedUntil } = getFailureState();
  return lockedUntil > Date.now();
}

async function unlockFromRecord(record: {
  userId: string;
  accessKey: string;
  active?: boolean | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!record.active) {
    return { ok: false, message: "This vault key has been revoked." };
  }
  clearFailures();
  setVaultUnlocked({
    userId: record.userId,
    accessKey: record.accessKey,
  });
  return { ok: true };
}

/** If the signed-in customer has an active vault key, unlock without typing it. */
export async function tryAutoUnlockVaultForSignedInUser(): Promise<boolean> {
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
    const row = data?.[0];
    if (!row?.accessKey || !row.userId) return false;
    const result = await unlockFromRecord(row);
    return result.ok;
  } catch {
    return false;
  }
}

export async function unlockVaultWithKey(
  key: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (isVaultUnlockLockedOut()) {
    return {
      ok: false,
      message: "Too many attempts. Wait a few minutes and try again.",
    };
  }

  const validationError = validateVaultAccessKey(key);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const client = await getGuestDataClient();
  if (!client) {
    return { ok: false, message: "Store API is not available." };
  }
  if (!hasVaultAccessModel(client)) {
    return {
      ok: false,
      message:
        "Vault access is not deployed yet. Redeploy the backend, then try again.",
    };
  }

  const accessKey = normalizeVaultAccessKey(key);

  try {
    const VaultAccess = requireVaultAccessModel(client);
    const { data, errors } = await VaultAccess.get({ accessKey });
    if (errors?.length) {
      return { ok: false, message: errors.map((e) => e.message).join("; ") };
    }
    if (!data) {
      recordFailure();
      return { ok: false, message: "Invalid access key." };
    }
    const result = await unlockFromRecord(data);
    if (!result.ok) {
      recordFailure();
    }
    return result;
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Unlock failed.",
    };
  }
}
