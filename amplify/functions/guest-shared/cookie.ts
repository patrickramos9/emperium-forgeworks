/** M6e — shared guest identity helpers (cookie + HMAC token for AppSync). */

export const GUEST_COOKIE_NAME = "efw_guest_id";
export const GUEST_ID_STORAGE_KEY = "efw_guest_id";
export const GUEST_TOKEN_STORAGE_KEY = "efw_guest_token";

/** 365 days */
export const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isGuestId(value: string | undefined | null): value is string {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function readGuestIdFromCookieHeader(
  cookieHeader: string | undefined,
): string | undefined {
  const cookies = parseCookieHeader(cookieHeader);
  const raw = cookies[GUEST_COOKIE_NAME];
  return isGuestId(raw) ? raw.trim() : undefined;
}

/**
 * Host-only cookie on the Function URL domain.
 * SameSite=None so credentialed cross-origin fetches from the storefront can re-send it.
 */
export function buildGuestSetCookieHeader(guestId: string): string {
  return [
    `${GUEST_COOKIE_NAME}=${encodeURIComponent(guestId)}`,
    "Path=/",
    `Max-Age=${GUEST_COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
  ].join("; ");
}

function getGuestSessionSecret(): string {
  const secret = process.env.GUEST_SESSION_SECRET?.trim();
  if (secret) return secret;
  // Sandbox / missing env — not for production. Set GUEST_SESSION_SECRET on deploy.
  return "dev-only-guest-session-secret-change-me";
}

/** HMAC token so AppSync mutations can verify guestId without receiving the HttpOnly cookie. */
export async function mintGuestToken(guestId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getGuestSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`efw-guest:v1:${guestId}`),
  );
  return bufferToBase64Url(sig);
}

export async function verifyGuestToken(
  guestId: string,
  token: string | undefined | null,
): Promise<boolean> {
  if (!isGuestId(guestId) || !token?.trim()) return false;
  const expected = await mintGuestToken(guestId);
  return timingSafeEqual(expected, token.trim());
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Reflect Origin when it is the storefront, localhost, or Amplify Hosting. */
export function resolveCorsOrigin(
  requestOrigin: string | undefined,
): string | null {
  if (!requestOrigin) return null;
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  if (siteUrl && requestOrigin === siteUrl) return requestOrigin;
  if (
    requestOrigin === "http://localhost:5173" ||
    requestOrigin === "http://127.0.0.1:5173" ||
    requestOrigin === "http://localhost:4173" ||
    requestOrigin === "http://127.0.0.1:4173"
  ) {
    return requestOrigin;
  }
  try {
    const host = new URL(requestOrigin).hostname;
    if (host.endsWith(".amplifyapp.com")) return requestOrigin;
  } catch {
    /* ignore */
  }
  return null;
}

export function corsHeaders(
  requestOrigin: string | undefined,
): Record<string, string> {
  const origin = resolveCorsOrigin(requestOrigin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}
