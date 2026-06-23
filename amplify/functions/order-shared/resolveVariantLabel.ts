type LegacyVariant = { id: string; label: string };

type VariantOption = { id: string; label: string };
type VariantGroup = {
  options: VariantOption[];
};

function parseJson(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function flattenVariantIds(raw: unknown): { id: string; label: string }[] {
  const parsed = parseJson(raw);
  if (!parsed) return [];

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as { version?: number }).version === 2 &&
    Array.isArray((parsed as { groups?: unknown }).groups)
  ) {
    const groups = ((parsed as { groups: VariantGroup[] }).groups ?? [])
      .map((group) => ({
        options: (group.options ?? []).filter((option) => option.label?.trim()),
      }))
      .filter((group) => group.options.length > 0);

    if (!groups.length) return [];

    if (groups.length === 1) {
      return groups[0].options.map((option) => ({
        id: option.id,
        label: option.label.trim(),
      }));
    }

    let combos: { id: string; label: string }[] = [{ id: "base", label: "" }];
    for (const group of groups) {
      const next: { id: string; label: string }[] = [];
      for (const combo of combos) {
        for (const option of group.options) {
          const id =
            combo.id === "base" ? option.id : `${combo.id}--${option.id}`;
          const label =
            combo.label === ""
              ? option.label.trim()
              : `${combo.label} / ${option.label.trim()}`;
          next.push({ id, label });
        }
      }
      combos = next;
    }
    return combos;
  }

  if (Array.isArray(parsed)) {
    return parsed
      .filter(
        (row): row is LegacyVariant =>
          typeof row === "object" &&
          row !== null &&
          typeof (row as LegacyVariant).id === "string" &&
          typeof (row as LegacyVariant).label === "string",
      )
      .map((row) => ({ id: row.id, label: row.label.trim() }));
  }

  return [];
}

/** Resolve storefront variant label from Product.variants JSON + cart variant id. */
export function resolveVariantLabelFromProductJson(
  variantsJson: unknown,
  variantId: string | undefined,
): string | undefined {
  if (!variantId?.trim()) return undefined;
  const match = flattenVariantIds(variantsJson).find(
    (variant) => variant.id === variantId,
  );
  return match?.label || undefined;
}
