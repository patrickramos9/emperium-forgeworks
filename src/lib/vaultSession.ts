const STORAGE_KEY = "emperium-vault-unlocked";
const TTL_MS = 24 * 60 * 60 * 1000;

export type VaultSession = {
  expiresAt: number;
  userId: string;
  accessKey: string;
};

export function isVaultUnlocked(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as VaultSession;
    if (
      !session.expiresAt ||
      !session.userId ||
      !session.accessKey ||
      Date.now() >= session.expiresAt
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getVaultSession(): VaultSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as VaultSession;
    if (
      !session.expiresAt ||
      !session.userId ||
      !session.accessKey ||
      Date.now() >= session.expiresAt
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setVaultUnlocked(session: {
  userId: string;
  accessKey: string;
}): void {
  const payload: VaultSession = {
    userId: session.userId,
    accessKey: session.accessKey,
    expiresAt: Date.now() + TTL_MS,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearVaultUnlocked(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
