/** URL-safe product slug for catalog routes and S3 paths under `products/{slug}/`. */
export function normalizeProductSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateProductSlug(slug: string): string | null {
  const normalized = normalizeProductSlug(slug);
  if (!normalized) return "Slug is required before uploading photos.";
  if (normalized.length < 2) return "Slug must be at least 2 characters.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return "Use lowercase letters, numbers, and hyphens only.";
  }
  return null;
}

/** Suggest a slug from a product title (new product form). */
export function productSlugFromTitle(title: string): string {
  return normalizeProductSlug(title);
}
