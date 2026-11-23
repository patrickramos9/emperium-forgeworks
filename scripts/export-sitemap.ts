/**
 * Write public/sitemap.xml for the production shop.
 *
 * Product URLs come from docs/merchant-center-feed.csv (same links Merchant
 * Center already uses). Vault, account, cart, and checkout are omitted.
 *
 * Usage: npm run export:sitemap
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const SITE = "https://emperiumforgeworks.com";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/about",
  "/contact",
  "/gallery",
  "/reviews",
  "/shipping-returns",
  "/privacy-policy",
  "/forge-terms",
  "/print",
];

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function productLinks(csv: string): string[] {
  const links = new Set<string>();
  const pattern = /https:\/\/emperiumforgeworks\.com\/shop\/[a-z0-9-]+/gi;
  for (const match of csv.matchAll(pattern)) {
    links.add(match[0]);
  }
  return [...links].sort();
}

function categoriesFromFeed(csv: string): string[] {
  const names = new Set<string>();
  for (const match of csv.matchAll(/Category:\s*([^,"<\n]+)/g)) {
    const name = match[1]?.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function main() {
  const csvPath = resolve(import.meta.dirname, "../docs/merchant-center-feed.csv");
  const csv = readFileSync(csvPath, "utf8");
  const urls = [
    ...STATIC_PATHS.map((path) => (path === "/" ? `${SITE}/` : `${SITE}${path}`)),
    ...categoriesFromFeed(csv).map(
      (category) =>
        `${SITE}/shop?category=${encodeURIComponent(category)}`,
    ),
    ...productLinks(csv),
  ];

  const body = urls
    .map(
      (url) =>
        `  <url><loc>${xmlEscape(url)}</loc></url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  const out = resolve(import.meta.dirname, "../public/sitemap.xml");
  writeFileSync(out, xml, "utf8");
  console.log(`Wrote ${urls.length} URLs → public/sitemap.xml`);
}

main();
