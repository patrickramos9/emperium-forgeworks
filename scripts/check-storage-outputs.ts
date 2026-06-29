/**
 * Fails the build when amplify_outputs.json storage rules drift from
 * amplify/storage/resource.ts. Prevents recurring "signed-in = no images".
 *
 * Run: npm run check:storage
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const storageSource = readFileSync(
  resolve(root, "amplify/storage/resource.ts"),
  "utf8",
);
const outputs = JSON.parse(
  readFileSync(resolve(root, "amplify_outputs.json"), "utf8"),
) as {
  storage?: {
    buckets?: Array<{
      paths?: Record<string, Record<string, string[] | undefined>>;
    }>;
  };
};

const productPaths =
  outputs.storage?.buckets?.[0]?.paths?.["products/*"] ?? {};
/** Group/authenticated rules on `{entity_id}` paths appear under `print-jobs/*` in outputs. */
const printJobGroupPaths =
  outputs.storage?.buckets?.[0]?.paths?.["print-jobs/*"] ?? {};
const printJobEntityPaths =
  outputs.storage?.buckets?.[0]?.paths?.[
    "print-jobs/${cognito-identity.amazonaws.com:sub}/*"
  ] ?? {};

function hasRead(perms: string[] | undefined): boolean {
  if (!perms?.length) return false;
  return perms.some((p) => p === "get" || p === "list" || p === "read");
}

function hasWrite(perms: string[] | undefined): boolean {
  if (!perms?.length) return false;
  return perms.some((p) => p === "write" || p === "put");
}

const errors: string[] = [];

if (
  storageSource.includes('allow.guest.to(["read"])') &&
  !hasRead(productPaths.guest)
) {
  errors.push(
    "products/*: guest read is defined in amplify/storage/resource.ts but missing in amplify_outputs.json — redeploy backend and commit updated outputs",
  );
}

if (
  storageSource.includes('allow.authenticated.to(["read"])') &&
  !hasRead(productPaths.authenticated)
) {
  errors.push(
    "products/*: authenticated read is in storage/resource.ts but missing in amplify_outputs.json — redeploy backend",
  );
}

if (
  storageSource.includes('allow.groups(["customer"]).to(["read"])') &&
  !hasRead(productPaths.groupscustomer)
) {
  errors.push(
    "products/*: customer group read is in storage/resource.ts but missing in amplify_outputs.json — redeploy backend (required for signed-in shoppers using default getUrl)",
  );
}

if (
  storageSource.includes('allow.groups(["admin"])') &&
  !hasWrite(productPaths.groupsadmin)
) {
  errors.push(
    "products/*: admin write is in storage/resource.ts but missing in amplify_outputs.json — redeploy backend",
  );
}

if (
  storageSource.includes('print-jobs/{entity_id}/*') &&
  storageSource.includes('allow.groups(["customer"]).to(["read", "write", "delete"])') &&
  !hasWrite(printJobGroupPaths.groupscustomer)
) {
  errors.push(
    "print-jobs/* (outputs): customer group write is in storage/resource.ts but missing in amplify_outputs.json — redeploy backend and run `npx ampx generate outputs` (required for /print uploads)",
  );
}

if (
  storageSource.includes('allow.entity("identity").to(["read", "write", "delete"])') &&
  storageSource.includes("print-jobs/{entity_id}/*") &&
  !hasWrite(printJobEntityPaths.entityidentity)
) {
  errors.push(
    "print-jobs entity path: identity write is in storage/resource.ts but missing in amplify_outputs.json — redeploy backend and regenerate outputs",
  );
}

if (errors.length > 0) {
  console.error("\n[check:storage] amplify_outputs.json is out of date:\n");
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nSee docs/storage-auth.md\n");
  process.exit(1);
}

console.log("[check:storage] products/* and print-jobs/* rules match storage/resource.ts");
