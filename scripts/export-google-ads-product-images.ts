/**
 * Stable product + image path list for Google Ads / Merchant Center prep.
 * Run: npx tsx scripts/export-google-ads-product-images.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

Amplify.configure(outputs);

import {
  isMerchantListedProduct,
  MERCHANT_SITE_URL,
} from "../src/lib/merchantFeed";
import { buildPublicProductImageUrl } from "../src/lib/publicProductImageUrl";

function galleryRefs(row: Schema["Product"]["type"]): string[] {
  const gallery = (row.images ?? []).filter(Boolean) as string[];
  const detail = row.detailImage?.trim() ?? "";
  if (detail && !gallery.includes(detail)) return [detail, ...gallery];
  return gallery;
}

function storagePath(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.startsWith("products/")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes(".s3.")) {
      return decodeURIComponent(url.pathname.replace(/^\//, ""));
    }
  } catch {
    /* static path */
  }
  return trimmed;
}

async function main() {
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

  const publicProducts = rows.filter(isMerchantListedProduct);

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [
    "title,slug,product_url,primary_image_storage_path,image_link",
    ...publicProducts
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((p) => {
      const path = storagePath(galleryRefs(p)[0] ?? "");
      const imageLink = path ? buildPublicProductImageUrl(path) ?? "" : "";
      return [
        esc(p.title.trim()),
        p.slug,
        esc(`${MERCHANT_SITE_URL}/shop/${p.slug}`),
        esc(path),
        esc(imageLink),
      ].join(",");
    }),
  ].join("\n");

  const out = resolve(import.meta.dirname, "../docs/google-ads-product-images.csv");
  writeFileSync(out, csv + "\n", "utf8");
  console.log(`Exported ${publicProducts.length} products → docs/google-ads-product-images.csv`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
