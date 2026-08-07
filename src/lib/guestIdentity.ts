/** Client-side storage keys for M6e guest identity (mirror of server cookie). */
export const GUEST_ID_STORAGE_KEY = "efw_guest_id";
export const GUEST_TOKEN_STORAGE_KEY = "efw_guest_token";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isGuestId(value: string | undefined | null): value is string {
  return Boolean(value && UUID_RE.test(value.trim()));
}
