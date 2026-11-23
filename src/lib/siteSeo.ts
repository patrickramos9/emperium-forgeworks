import { SITE_URL } from "@/lib/config";

const BRAND = "Emperium Forgeworks";

/** Production origin used in canonical, Open Graph, and JSON-LD URLs. */
export function canonicalOrigin(): string {
  const configured = SITE_URL.replace(/\/$/, "");
  if (configured.startsWith("https://")) return configured;
  return "https://emperiumforgeworks.com";
}

export function canonicalUrl(path: string): string {
  const origin = canonicalOrigin();
  if (!path || path === "/") return `${origin}/`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function brandTitle(page: string): string {
  const name = page.trim();
  if (!name || name.toLowerCase() === BRAND.toLowerCase()) return BRAND;
  return `${name} | ${BRAND}`;
}

/** Product title Google can match: product name, then category when it is not already in the name. */
export function productDocumentTitle(title: string, category?: string): string {
  const name = title.trim();
  const cat = category?.trim();
  if (cat && !name.toLowerCase().includes(cat.toLowerCase())) {
    return `${name} | ${cat} miniature | ${BRAND}`;
  }
  return brandTitle(name);
}

export function trimMetaDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim();
  return `${base}…`;
}

const DESC_ID = "emperium-meta-description";
const CANONICAL_ID = "emperium-canonical";
const ROBOTS_ID = "emperium-robots";
const PAGE_OG = "data-emperium-page-og";

function upsertMeta(id: string, attrs: Record<string, string>) {
  let el = document.getElementById(id) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.id = id;
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
}

function upsertLink(id: string, rel: string, href: string) {
  let el = document.getElementById(id) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.id = id;
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function clearPageOpenGraph() {
  document.head
    .querySelectorAll(`meta[${PAGE_OG}]`)
    .forEach((node) => node.remove());
}

export function applyDocumentTitle(title: string) {
  document.title = title;
}

export function applyMetaDescription(description: string) {
  upsertMeta(DESC_ID, { name: "description", content: description });
}

export function applyCanonical(path: string) {
  upsertLink(CANONICAL_ID, "canonical", canonicalUrl(path));
}

export function applyRobots(content: string) {
  upsertMeta(ROBOTS_ID, { name: "robots", content });
}

/** Open Graph for non-product pages. Product pages keep the single set written by ProductJsonLd. */
export function applyPageOpenGraph(tags: Record<string, string>) {
  clearPageOpenGraph();
  for (const [property, content] of Object.entries(tags)) {
    const meta = document.createElement("meta");
    meta.setAttribute("property", property);
    meta.setAttribute("content", content);
    meta.setAttribute(PAGE_OG, "1");
    document.head.appendChild(meta);
  }
}

export function clearPageOpenGraphTags() {
  clearPageOpenGraph();
}

export function upsertJsonLd(id: string, data: Record<string, unknown> | null) {
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }
  const script = existing ?? document.createElement("script");
  script.id = id;
  script.setAttribute("type", "application/ld+json");
  script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  if (!existing) document.head.appendChild(script);
}
