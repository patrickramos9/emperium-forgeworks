import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { signIn } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import { findProductBySlug } from "../src/lib/listAllProducts";
import { PRINT_SERVICE_CATALOG_SLUG } from "../src/lib/printService";

Amplify.configure(outputs);

const ADMIN_EMAIL = "admin@emperiumforgeworks.com";

async function listShippingProfiles(client: ReturnType<typeof generateClient<Schema>>) {
  const rows: Schema["ShippingProfile"]["type"][] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.models.ShippingProfile.list({ limit: 50, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);
  return rows.sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
  );
}

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? "EmperiumForge2026!";
  console.log(`Signing in as ${ADMIN_EMAIL}...`);
  await signIn({ username: ADMIN_EMAIL, password });

  const client = generateClient<Schema>({ authMode: "userPool" });
  const Product = client.models.Product;
  if (!Product) {
    console.error("Product model is not deployed.");
    process.exit(1);
  }

  const existing = await findProductBySlug(client, PRINT_SERVICE_CATALOG_SLUG);
  if (existing) {
    console.log("Print service catalog product already exists:", {
      id: existing.id,
      slug: existing.slug,
      title: existing.title,
      shippingProfileId: existing.shippingProfileId,
      weightOz: existing.weightOz,
    });
    return;
  }

  const profiles = await listShippingProfiles(client);
  const activeProfiles = profiles.filter((p) => p.active !== false);
  const defaultProfile =
    activeProfiles.find((p) => p.isDefault) ?? activeProfiles[0] ?? null;

  if (!defaultProfile) {
    throw new Error(
      "No active shipping profile found. Create one in Admin → Shipping first.",
    );
  }

  const result = await Product.create({
    slug: PRINT_SERVICE_CATALOG_SLUG,
    title: "Printing as a Service",
    subtitle: "Custom STL print (hidden from shop catalog)",
    category: "Print Service",
    priceCents: 2500,
    inStock: true,
    featured: false,
    sortOrder: 9999,
    vaultOnly: false,
    shippingProfileId: defaultProfile.id,
    weightOz: 16,
    badges: [],
    images: [],
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }

  console.log("Created print service catalog product:", {
    id: result.data?.id,
    slug: result.data?.slug,
    shippingProfileId: defaultProfile.id,
    shippingProfileName: defaultProfile.name,
    weightOz: 16,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
