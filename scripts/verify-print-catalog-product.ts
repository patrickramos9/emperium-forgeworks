/**
 * Verify print service catalog product is readable (guest + signed-in).
 * Usage: npx tsx scripts/verify-print-catalog-product.ts
 */
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import { signIn } from "aws-amplify/auth";
import { PRINT_SERVICE_CATALOG_SLUG } from "../src/lib/printService";
import { listAllProducts } from "../src/lib/listAllProducts";

Amplify.configure(outputs);

async function lookupByFilter(
  client: ReturnType<typeof generateClient<Schema>>,
  slug: string,
) {
  const response = await client.models.Product.list({
    filter: { slug: { eq: slug } },
    limit: 1,
  });
  return {
    errors: response.errors?.map((e) => e.message),
    count: response.data?.length ?? 0,
    id: response.data?.[0]?.id,
  };
}

async function lookupByScan(
  client: ReturnType<typeof generateClient<Schema>>,
  slug: string,
) {
  const rows = await listAllProducts(client);
  const match = rows.find((row) => row.slug === slug);
  return { total: rows.length, id: match?.id, title: match?.title };
}

async function main() {
  console.log("API:", outputs.data?.url);
  const slug = PRINT_SERVICE_CATALOG_SLUG;

  const iamClient = generateClient<Schema>({ authMode: "iam" });
  console.log("\nGuest (IAM) filter lookup:", await lookupByFilter(iamClient, slug));
  console.log("Guest (IAM) scan lookup:", await lookupByScan(iamClient, slug));

  const password = process.env.ADMIN_PASSWORD ?? "EmperiumForge2026!";
  await signIn({ username: "admin@emperiumforgeworks.com", password });
  const poolClient = generateClient<Schema>({ authMode: "userPool" });
  console.log("\nUserPool filter lookup:", await lookupByFilter(poolClient, slug));
  console.log("UserPool scan lookup:", await lookupByScan(poolClient, slug));

  const config = await poolClient.models.PrintServiceConfig.get({
    configKey: "default",
  });
  console.log("\nPrintServiceConfig:", {
    active: config.data?.active,
    catalogProductSlug: config.data?.catalogProductSlug,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
