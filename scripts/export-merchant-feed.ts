/**
 * Export full Google Merchant Center product feed (CSV).
 *
 * Requires backend deploy with public products/* read (see docs/merchant-center-feed.md).
 *
 * Usage: npm run export:merchant-feed
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import {
  isMerchantListedProduct,
  MERCHANT_FEED_HEADERS,
  merchantRowToCsv,
  productToMerchantRow,
} from "../src/lib/merchantFeed";

Amplify.configure(outputs);

async function loadPublicProducts() {
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

  return rows
    .filter(isMerchantListedProduct)
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function main() {
  const products = await loadPublicProducts();
  const rows: string[] = [];
  const skipped: string[] = [];

  for (const product of products) {
    const row = productToMerchantRow(product);
    if (!row) {
      skipped.push(product.slug);
      continue;
    }
    rows.push(merchantRowToCsv(row));
  }

  const csv = [MERCHANT_FEED_HEADERS.join(","), ...rows].join("\n") + "\n";
  const out = resolve(import.meta.dirname, "../docs/merchant-center-feed.csv");
  writeFileSync(out, csv, "utf8");

  console.log(`Exported ${rows.length} products → docs/merchant-center-feed.csv`);
  if (skipped.length) {
    console.warn(
      `Skipped ${skipped.length} without public image (products/* path):`,
      skipped.join(", "),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
