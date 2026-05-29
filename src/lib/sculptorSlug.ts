export function normalizeSculptorSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateSculptorSlug(slug: string): string | null {
  const normalized = normalizeSculptorSlug(slug);
  if (!normalized) return "Slug is required.";
  if (normalized.length < 2) return "Slug must be at least 2 characters.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return "Use lowercase letters, numbers, and hyphens only.";
  }
  return null;
}
