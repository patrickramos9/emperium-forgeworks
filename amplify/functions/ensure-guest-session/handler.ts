import { randomUUID } from "node:crypto";
import {
  buildGuestSetCookieHeader,
  corsHeaders,
  isGuestId,
  mintGuestToken,
  readGuestIdFromCookieHeader,
} from "../guest-shared/cookie.js";

type FunctionUrlEvent = {
  requestContext?: { http?: { method?: string } };
  headers?: Record<string, string | undefined>;
  body?: string | null;
};

function header(
  headers: Record<string, string | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  requestOrigin: string | undefined,
  setCookie?: string,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...corsHeaders(requestOrigin),
  };
  if (setCookie) {
    headers["set-cookie"] = setCookie;
  }
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

/**
 * M6e foundation — mint or echo guest identity.
 * Function URL (not AppSync) so we can Set-Cookie.
 * Also returns HMAC guestToken for AppSync mutations (cookie is host-only on this URL).
 */
export const handler = async (event: FunctionUrlEvent) => {
  const method =
    event.requestContext?.http?.method?.toUpperCase() ?? "GET";
  const requestOrigin = header(event.headers, "origin");

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(requestOrigin),
      body: "",
    };
  }

  if (method !== "GET" && method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, requestOrigin);
  }

  const cookieHeader = header(event.headers, "cookie");
  let guestId = readGuestIdFromCookieHeader(cookieHeader);
  let created = false;

  if (!guestId) {
    // Optional body: { guestId } from localStorage mirror when cookie missing (same browser return).
    if (event.body) {
      try {
        const parsed = JSON.parse(event.body) as { guestId?: string };
        if (isGuestId(parsed.guestId)) {
          guestId = parsed.guestId.trim();
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (!guestId) {
    guestId = randomUUID();
    created = true;
  }

  const guestToken = await mintGuestToken(guestId);

  return jsonResponse(
    200,
    { guestId, guestToken, created },
    requestOrigin,
    buildGuestSetCookieHeader(guestId),
  );
};
