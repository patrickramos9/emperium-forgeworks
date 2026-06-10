/**
 * Deletes all PromoGrant and PromoTemplate records (test data reset).
 * Usage: npx tsx scripts/reset-promo-data.ts
 */
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { signIn } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

Amplify.configure(outputs);

const ADMIN_EMAIL = "admin@emperiumforgeworks.com";

async function listAll<T extends { id: string }>(
  listFn: (args: {
    limit?: number;
    nextToken?: string;
  }) => Promise<{
    data?: (T | null)[] | null;
    errors?: { message: string }[] | null;
    nextToken?: string | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  let nextToken: string | undefined;

  do {
    const response = await listFn({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows;
}

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? "EmperiumForge2026!";
  console.log(`Signing in as ${ADMIN_EMAIL}...`);
  await signIn({ username: ADMIN_EMAIL, password });

  const client = generateClient<Schema>({ authMode: "userPool" });

  if (!client.models.PromoGrant || !client.models.PromoTemplate) {
    console.error("PromoGrant/PromoTemplate models are not available. Deploy backend first.");
    process.exit(1);
  }

  const grants = await listAll((args) => client.models.PromoGrant.list(args));
  console.log(`Found ${grants.length} promo grant(s).`);
  for (const grant of grants) {
    const { errors } = await client.models.PromoGrant.delete({ id: grant.id });
    if (errors?.length) {
      throw new Error(
        `Failed to delete grant ${grant.id}: ${errors.map((e) => e.message).join("; ")}`,
      );
    }
    console.log(`  Deleted grant ${grant.id} (${grant.source ?? "unknown source"})`);
  }

  const templates = await listAll((args) => client.models.PromoTemplate.list(args));
  console.log(`Found ${templates.length} promo template(s).`);
  for (const template of templates) {
    const { errors } = await client.models.PromoTemplate.delete({ id: template.id });
    if (errors?.length) {
      throw new Error(
        `Failed to delete template ${template.id}: ${errors.map((e) => e.message).join("; ")}`,
      );
    }
    console.log(`  Deleted template ${template.id} (${template.name})`);
  }

  console.log("Promo data reset complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
