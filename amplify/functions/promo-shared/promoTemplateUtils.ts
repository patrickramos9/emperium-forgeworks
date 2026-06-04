const INDEFINITE_ISO = "2099-12-31T23:59:59.999Z";

export function expiresAtFromTemplateDays(
  defaultExpiresInDays: number | null | undefined,
): string {
  if (defaultExpiresInDays == null || defaultExpiresInDays <= 0) {
    return INDEFINITE_ISO;
  }
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + defaultExpiresInDays);
  return date.toISOString();
}

export function isGrantOpen(
  grant: {
    revokedAt?: string | null;
    redeemedAt?: string | null;
    expiresAt?: string | null;
  },
  nowMs = Date.now(),
): boolean {
  if (grant.revokedAt || grant.redeemedAt) return false;
  const expires = grant.expiresAt?.trim() || INDEFINITE_ISO;
  return Date.parse(expires) > nowMs;
}
