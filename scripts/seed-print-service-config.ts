/**
 * Seeds the PrintServiceConfig singleton when missing (active by default).
 *
 * Usage: npx tsx scripts/seed-print-service-config.ts
 */
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { signIn } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import {
  defaultPrintServiceConfig,
  PRINT_SERVICE_CONFIG_KEY,
} from "../src/lib/printService";

function toJsonField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

Amplify.configure(outputs);

const ADMIN_EMAIL = "admin@emperiumforgeworks.com";

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? "EmperiumForge2026!";
  console.log(`Signing in as ${ADMIN_EMAIL}...`);
  await signIn({ username: ADMIN_EMAIL, password });

  const client = generateClient<Schema>({ authMode: "userPool" });
  const model = client.models.PrintServiceConfig;
  if (!model) {
    console.error("PrintServiceConfig is not deployed. Redeploy the backend first.");
    process.exit(1);
  }

  const existing = await model.get({ configKey: PRINT_SERVICE_CONFIG_KEY });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }

  const defaults = { ...defaultPrintServiceConfig(), active: true };
  const payload = {
    configKey: PRINT_SERVICE_CONFIG_KEY,
    active: defaults.active,
    catalogProductSlug: defaults.catalogProductSlug,
    policyMarkdown: defaults.policyMarkdown,
    maxFileBytes: defaults.maxFileBytes,
    sizeTiers: toJsonField(defaults.sizeTiers),
    resinTypes: toJsonField(defaults.resinTypes),
    resinColors: toJsonField(defaults.resinColors),
  };

  if (existing.data) {
    console.log("PrintServiceConfig already exists:", {
      active: existing.data.active,
      catalogProductSlug: existing.data.catalogProductSlug,
    });
    if (existing.data.active === true) {
      console.log("Already active — nothing to do.");
      return;
    }
    const result = await model.update({ ...payload, active: true });
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
    console.log("Updated PrintServiceConfig (active: true).");
    return;
  }

  const result = await model.create(payload);
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  console.log("Created PrintServiceConfig (active: true).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
