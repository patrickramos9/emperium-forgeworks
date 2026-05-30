const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*?>/i;

/** Decode entity-encoded HTML (e.g. `&lt;p&gt;` → `<p>`). */
export function decodeRichTextHtml(value: string): string {
  if (!/&lt;|&gt;|&amp;|&quot;|&#/.test(value)) return value;
  const el = document.createElement("textarea");
  el.innerHTML = value;
  return el.value;
}

export function looksLikeRichTextHtml(value: string): boolean {
  return HTML_TAG_PATTERN.test(value);
}

/** True when TipTap output is empty (e.g. `<p></p>`). */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html?.trim()) return true;
  const decoded = decodeRichTextHtml(html);
  const text = decoded.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return text.length === 0;
}

export function normalizeRichTextForSave(html: string): string | undefined {
  return isRichTextEmpty(html) ? undefined : html.trim();
}

/** Normalize stored value for TipTap or DOM render. */
export function prepareRichTextForDisplay(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";
  const decoded = decodeRichTextHtml(trimmed);
  if (looksLikeRichTextHtml(decoded)) return decoded;
  return decoded
    .split(/\n{2,}/)
    .map((block) => {
      const escaped = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p>${escaped}</p>`;
    })
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const RICH_TEXT_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "span",
  "mark",
] as const;

export const RICH_TEXT_ALLOWED_ATTR = ["href", "target", "rel", "style", "class"] as const;
