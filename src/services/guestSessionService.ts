import outputs from "../../amplify_outputs.json";
import {
  GUEST_ID_STORAGE_KEY,
  GUEST_TOKEN_STORAGE_KEY,
} from "@/lib/guestIdentity";

type CustomOutputs = {
  custom?: {
    ensureGuestSessionUrl?: string;
  };
};

export type GuestSession = {
  guestId: string;
  guestToken: string;
  created: boolean;
};

function getEnsureGuestSessionUrl(): string | null {
  const url = (outputs as CustomOutputs).custom?.ensureGuestSessionUrl?.trim();
  return url || null;
}

export function getStoredGuestSession(): {
  guestId: string;
  guestToken: string;
} | null {
  try {
    const guestId = localStorage.getItem(GUEST_ID_STORAGE_KEY)?.trim() ?? "";
    const guestToken =
      localStorage.getItem(GUEST_TOKEN_STORAGE_KEY)?.trim() ?? "";
    if (!guestId || !guestToken) return null;
    return { guestId, guestToken };
  } catch {
    return null;
  }
}

function storeGuestSession(guestId: string, guestToken: string): void {
  try {
    localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
    localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, guestToken);
  } catch {
    /* private mode / quota */
  }
}

/**
 * M6e — ensure HttpOnly guest cookie (Function URL) + local HMAC token mirror.
 * Safe to call repeatedly; no-ops when backend URL is not in amplify_outputs yet.
 */
export async function ensureGuestSession(): Promise<GuestSession | null> {
  const url = getEnsureGuestSessionUrl();
  if (!url) return null;

  const stored = getStoredGuestSession();
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(stored ? { guestId: stored.guestId } : {}),
  });

  if (!response.ok) {
    throw new Error(`Guest session failed (${response.status})`);
  }

  const data = (await response.json()) as {
    guestId?: string;
    guestToken?: string;
    created?: boolean;
  };

  if (!data.guestId || !data.guestToken) {
    throw new Error("Guest session response missing credentials");
  }

  storeGuestSession(data.guestId, data.guestToken);
  return {
    guestId: data.guestId,
    guestToken: data.guestToken,
    created: Boolean(data.created),
  };
}
