/**
 * Fails the build when amplify_outputs.json is missing PrintServiceConfig
 * after M21 schema was added to amplify/data/resource.ts.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataSource = readFileSync(
  resolve(root, "amplify/data/resource.ts"),
  "utf8",
);
const outputs = JSON.parse(
  readFileSync(resolve(root, "amplify_outputs.json"), "utf8"),
) as {
  data?: {
    model_introspection?: {
      models?: Record<string, unknown>;
    };
  };
};

const errors: string[] = [];

if (
  dataSource.includes("PrintServiceConfig:") &&
  !outputs.data?.model_introspection?.models?.PrintServiceConfig
) {
  errors.push(
    "PrintServiceConfig is defined in amplify/data/resource.ts but missing in amplify_outputs.json — run `npx ampx generate outputs --app-id <id> --branch main --profile default` or redeploy the backend",
  );
}

if (errors.length > 0) {
  console.error("\n[check:print-service] amplify_outputs.json is out of date:\n");
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log("[check:print-service] PrintServiceConfig present in amplify_outputs.json");
