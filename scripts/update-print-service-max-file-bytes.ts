/**
 * Sets PrintServiceConfig.maxFileBytes to the app default (1 GiB).
 * Usage: npx tsx scripts/update-print-service-max-file-bytes.ts
 */
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { signIn } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import {
  DEFAULT_MAX_STL_BYTES,
  PRINT_SERVICE_CONFIG_KEY,
} from "../src/lib/printService";

Amplify.configure(outputs);

const ADMIN_EMAIL = "admin@emperiumforgeworks.com";

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? "EmperiumForge2026!";
  await signIn({ username: ADMIN_EMAIL, password });

  const client = generateClient<Schema>({ authMode: "userPool" });
  const model = client.models.PrintServiceConfig;
  if (!model) {
    throw new Error("PrintServiceConfig is not deployed.");
  }

  const existing = await model.get({ configKey: PRINT_SERVICE_CONFIG_KEY });
  if (existing.errors?.length) {
    throw new Error(existing.errors.map((e) => e.message).join("; "));
  }
  if (!existing.data) {
    throw new Error("PrintServiceConfig row missing — run seed-print-service-config.ts first.");
  }

  if (existing.data.maxFileBytes === DEFAULT_MAX_STL_BYTES) {
    console.log("maxFileBytes already set:", DEFAULT_MAX_STL_BYTES);
    return;
  }

  const result = await model.update({
    configKey: PRINT_SERVICE_CONFIG_KEY,
    maxFileBytes: DEFAULT_MAX_STL_BYTES,
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }

  console.log("Updated maxFileBytes:", {
    from: existing.data.maxFileBytes,
    to: result.data?.maxFileBytes,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
