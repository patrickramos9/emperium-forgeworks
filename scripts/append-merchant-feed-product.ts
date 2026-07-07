/**
 * Appends one catalog product to a Google Merchant Center template CSV.
 *
 * Usage:
 *   npx tsx scripts/append-merchant-feed-product.ts "C:\path\to\feed.csv"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import {
  isMerchantListedProduct,
  merchantRowToCsv,
  productToMerchantRow,
} from "../src/lib/merchantFeed";

Amplify.configure(outputs);

async function loadFirstPublicProduct() {
  const client = generateClient<Schema>();
  const rows: Schema["Product"]["type"][] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.models.Product.list({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  const product = rows
    .filter(isMerchantListedProduct)
    .sort((a, b) => a.title.localeCompare(b.title))[0];

  if (!product) throw new Error("No public products found.");
  return product;
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    throw new Error("Pass the Merchant Center CSV path as the first argument.");
  }

  const product = await loadFirstPublicProduct();
  const row = productToMerchantRow(product);
  if (!row) {
    throw new Error(
      `Product "${product.slug}" has no public products/* image path.`,
    );
  }

  const csvPath = resolve(target);
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const deleteHintIndex = lines.findIndex((line) =>
    line.startsWith('"Delete the rows that contain descriptions'),
  );
  const insertAt = deleteHintIndex >= 0 ? deleteHintIndex : lines.length;
  lines.splice(insertAt, 0, merchantRowToCsv(row));

  writeFileSync(csvPath, lines.join("\n"), "utf8");
  console.log(`Appended product: ${product.title.trim()} (${product.slug})`);
  console.log(`→ ${csvPath}`);
  console.log(`image_link: ${row.image_link}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
