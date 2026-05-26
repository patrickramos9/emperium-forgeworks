const VAULT_KEY_PATTERN = /^[A-Za-z0-9]{1,20}$/;

export function normalizeVaultAccessKey(key: string): string {
  return key.trim();
}

export function validateVaultAccessKey(key: string): string | null {
  const normalized = normalizeVaultAccessKey(key);
  if (!normalized) return "Access key is required.";
  if (normalized.length > 20) return "Access key must be at most 20 characters.";
  if (!VAULT_KEY_PATTERN.test(normalized)) {
    return "Access key must use letters and numbers only (A–Z, a–z, 0–9).";
  }
  return null;
}
