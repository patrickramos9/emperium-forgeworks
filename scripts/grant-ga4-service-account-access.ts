/**
 * Grant a GCP service account Viewer access on a GA4 property.
 *
 * The GA4 web UI often rejects *.iam.gserviceaccount.com emails ("not a valid
 * Google account"). The Admin API is the supported workaround.
 *
 * Prerequisites:
 * 1. Enable "Google Analytics Admin API" on your GCP project.
 * 2. Log in with YOUR human Google account (GA4 Administrator):
 *    gcloud auth application-default login --scopes="https://www.googleapis.com/auth/analytics.manage.users,https://www.googleapis.com/auth/cloud-platform"
 *
 * Usage (from repo root):
 *   npm run grant:ga4-access
 *
 * Reads GA4_PROPERTY_ID and GA4_CLIENT_EMAIL from .env.local when set.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GoogleAuth } from "google-auth-library";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(import.meta.dirname, "../.env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const propertyId = process.env.GA4_PROPERTY_ID?.trim() ?? "539229345";
  const serviceAccountEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  if (!serviceAccountEmail) {
    throw new Error(
      "Set GA4_CLIENT_EMAIL (service account client_email from your JSON key).",
    );
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/analytics.manage.users"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse.token;
  if (!accessToken) {
    throw new Error(
      "No access token. Run: gcloud auth application-default login --scopes=\"https://www.googleapis.com/auth/analytics.manage.users,https://www.googleapis.com/auth/cloud-platform\"",
    );
  }

  const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/accessBindings`;
  const body = {
    user: `serviceAccount:${serviceAccountEmail}`,
    roles: ["predefinedRoles/viewer"],
  };

  console.log(`Granting Viewer on property ${propertyId} to:\n  ${serviceAccountEmail}\n`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (response.ok) {
    console.log("Success. Access binding created.");
    console.log(text ? JSON.stringify(JSON.parse(text), null, 2) : "");
    return;
  }

  if (response.status === 409 || text.includes("ALREADY_EXISTS")) {
    console.log("Service account already has access on this property.");
    return;
  }

  console.error(`Failed (${response.status}):`, text);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
