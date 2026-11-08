import type { Product } from "@/data/seedProducts";

const MAX_QUERY_LENGTH = 80;
const MAX_TOKEN_LENGTH = 40;
const MAX_TOKENS = 8;

function plainText(value: string | undefined, limit: number): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/** Fields a shopper might remember: name, category, sculptor, size, and copy. */
export function productSearchText(product: Product): string {
  const variantLabels = [
    ...product.variants.map((variant) => variant.label),
    ...product.variantGroups.flatMap((group) => [
      group.name,
      ...group.options.map((option) => option.label),
    ]),
  ];

  return [
    product.title,
    product.subtitle,
    product.category,
    product.slug.replace(/-/g, " "),
    product.specs?.sculptor,
    product.specs?.material,
    ...product.badges,
    ...variantLabels,
    plainText(product.description, 500),
    plainText(product.lore, 300),
  ]
    .filter((part) => part?.trim())
    .join(" ");
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .slice(0, MAX_QUERY_LENGTH)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_TOKENS)
    .map((token) => token.slice(0, MAX_TOKEN_LENGTH));
}

/**
 * Close-match pattern for one token.
 * 1–2 characters stay literal so short queries do not match everything.
 * Longer tokens allow one extra character between each typed letter, so
 * omitted letters still hit ("samuri" → "samurai", "skeltal" → "skeletal").
 */
function tokenPattern(token: string): string {
  const chars = [...token].map(escapeRegExp);
  if (chars.length < 3) return chars.join("");
  return chars.join(".{0,1}");
}

/** Case-insensitive regex that requires every token as a close match. */
export function closeMatchRegExp(query: string): RegExp | null {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return null;
  const lookaheads = tokens.map((token) => `(?=.*${tokenPattern(token)})`);
  return new RegExp(`${lookaheads.join("")}.*`, "i");
}

/** Finds the close-match spans inside a title for type-ahead highlighting. */
export function closeMatchTokenRegExp(query: string): RegExp | null {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return null;
  return new RegExp(tokens.map(tokenPattern).join("|"), "gi");
}

export function productSearchScore(product: Product, query: string): number {
  const pattern = closeMatchRegExp(query);
  if (!pattern) return 0;

  const title = product.title;
  const haystack = productSearchText(product);
  if (!pattern.test(haystack)) return 0;

  const q = query.trim().toLowerCase();
  const titleLower = title.toLowerCase();
  const categoryLower = product.category.toLowerCase();
  let score = 10;

  if (titleLower === q) score += 100;
  else if (titleLower.startsWith(q)) score += 80;
  else if (titleLower.includes(q)) score += 60;
  else if (pattern.test(title)) score += 40;

  if (categoryLower === q) score += 50;
  else if (categoryLower.includes(q)) score += 20;

  return score;
}

export function rankProductsForSearch(
  products: Product[],
  query: string,
): Product[] {
  const q = query.trim();
  if (!q) {
    return [...products].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return products
    .map((product) => ({ product, score: productSearchScore(product, q) }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.product.sortOrder - b.product.sortOrder,
    )
    .map((row) => row.product);
}

export function highlightSearchMatches(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  const pattern = closeMatchTokenRegExp(query);
  if (!pattern) return [{ text, match: false }];

  const parts: { text: string; match: boolean }[] = [];
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const chunk = match[0];
    if (!chunk) break;
    if (start > last) {
      parts.push({ text: text.slice(last, start), match: false });
    }
    parts.push({ text: chunk, match: true });
    last = start + chunk.length;
  }

  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length > 0 ? parts : [{ text, match: false }];
}
