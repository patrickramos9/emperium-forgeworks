/**
 * Seeds DynamoDB via Amplify Data after sandbox is running.
 * Usage: npx tsx scripts/seed-products.ts
 */
import { SEED_PRODUCTS } from "../src/data/seedProducts";
import { CATALOG_SETTINGS_KEY } from "../src/lib/catalogSettings";
import { DEFAULT_PRODUCT_CATEGORY_FILTERS } from "../src/lib/productCategories";
import { buildProductMutationPayload } from "../src/lib/productPayload";

async function main() {
  let outputs: { default?: unknown };
  try {
    outputs = await import("../amplify_outputs.json");
  } catch {
    console.error(
      "amplify_outputs.json not found. Run `npm run sandbox` first.",
    );
    process.exit(1);
  }

  const { Amplify } = await import("aws-amplify");
  Amplify.configure(outputs.default ?? outputs);

  const { generateClient } = await import("aws-amplify/data");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = generateClient<any>();

  for (const product of SEED_PRODUCTS) {
    const { data: existing } = await client.models.Product.list({
      filter: { slug: { eq: product.slug } },
    });

    const payload = buildProductMutationPayload({
      slug: product.slug,
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      lore: product.lore,
      category: product.category,
      priceCents: product.priceCents,
      badges: product.badges,
      images: product.images,
      detailImage: product.detailImage,
      variantGroups: product.variantGroups,
      specs: product.specs,
      inStock: product.inStock,
      featured: product.featured,
      sortOrder: product.sortOrder,
    });

    if (existing?.[0]) {
      await client.models.Product.update({
        id: existing[0].id,
        ...payload,
      });
      console.log(`Updated: ${product.slug}`);
    } else {
      await client.models.Product.create(payload);
      console.log(`Created: ${product.slug}`);
    }
  }

  if (client.models.CatalogSettings) {
    const { data: existingSettings } = await client.models.CatalogSettings.get({
      settingsKey: CATALOG_SETTINGS_KEY,
    });

    if (!existingSettings) {
      await client.models.CatalogSettings.create({
        settingsKey: CATALOG_SETTINGS_KEY,
        categoryFilters: [...DEFAULT_PRODUCT_CATEGORY_FILTERS],
      });
      console.log("Created catalog category filters.");
    }
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
