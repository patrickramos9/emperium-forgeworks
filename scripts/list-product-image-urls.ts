/**
 * Lists product image URLs for Google Ads / Merchant Center prep.
 *
 * Usage: npx tsx scripts/list-product-image-urls.ts
 */
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { getUrl } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

Amplify.configure(outputs);

const SITE_URL = "https://emperiumforgeworks.com";
const PRINT_SERVICE_SLUG = "printing-as-a-service";

function normalizeImageRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.startsWith("products/") ||
    trimmed.startsWith("sculptors/") ||
    trimmed.startsWith("reviews/")
  ) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes(".s3.") && url.hostname.endsWith(".amazonaws.com")) {
      const path = decodeURIComponent(url.pathname.replace(/^\//, ""));
      if (
        path.startsWith("products/") ||
        path.startsWith("sculptors/") ||
        path.startsWith("reviews/")
      ) {
        return path;
      }
    }
  } catch {
    /* static paths */
  }
  return trimmed;
}

function isStoragePath(ref: string): boolean {
  return (
    ref.startsWith("products/") ||
    ref.startsWith("sculptors/") ||
    ref.startsWith("reviews/")
  );
}

function galleryRefs(row: Schema["Product"]["type"]): string[] {
  const gallery = (row.images ?? [])
    .map((img) => normalizeImageRef(img ?? ""))
    .filter(Boolean);
  const detail = row.detailImage ? normalizeImageRef(row.detailImage) : "";
  if (detail && !gallery.includes(detail)) return [detail, ...gallery];
  return gallery;
}

async function resolveRef(ref: string): Promise<string | undefined> {
  const path = normalizeImageRef(ref);
  if (!path) return undefined;
  if (!isStoragePath(path)) {
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (path.startsWith("/")) return `${SITE_URL}${path}`;
    return path;
  }
  try {
    const { url } = await getUrl({ path });
    return url.toString();
  } catch {
    return undefined;
  }
}

async function listAllProducts() {
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
  return rows.sort((a, b) => a.title.localeCompare(b.title));
}

async function main() {
  const rows = await listAllProducts();
  const publicProducts = rows.filter(
    (p) => !p.vaultOnly && p.slug !== PRINT_SERVICE_SLUG,
  );

  console.log(`\n=== Primary image URL per product (${publicProducts.length}) ===\n`);

  const lines: { title: string; slug: string; url: string; page: string }[] = [];

  for (const row of publicProducts) {
    const refs = galleryRefs(row);
    const primaryRef = refs[0];
    if (!primaryRef) {
      console.log(`${row.title} (${row.slug})\n  (no image)\n`);
      continue;
    }
    const url = await resolveRef(primaryRef);
    const page = `${SITE_URL}/shop/${row.slug}`;
    if (url) {
      lines.push({ title: row.title, slug: row.slug, url, page });
      console.log(`${row.title}`);
      console.log(`  Product: ${page}`);
      console.log(`  Image:   ${url}\n`);
    } else {
      console.log(`${row.title} (${row.slug})\n  (could not resolve image)\n`);
    }
  }

  console.log("\n=== CSV (title, slug, product_url, image_url) ===\n");
  console.log("title,slug,product_url,image_url");
  for (const line of lines) {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    console.log(
      [esc(line.title), line.slug, esc(line.page), esc(line.url)].join(","),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
