import type { ProductVariant } from "@/data/seedProducts";
import { normalizeImageRef } from "@/lib/productImageRefs";

export type VariationKind = "size" | "type" | "custom";

export interface ProductVariantOption {
  id: string;
  label: string;
  priceDeltaCents: number;
  /** S3 path matching an entry in the product gallery (e.g. products/slug/photo.jpg). */
  imageRef?: string;
}

export interface ProductOptionGroup {
  id: string;
  kind: VariationKind;
  name: string;
  options: ProductVariantOption[];
}

export interface StoredVariantsV2 {
  version: 2;
  groups: ProductOptionGroup[];
}

const KIND_DEFAULT_NAMES: Record<Exclude<VariationKind, "custom">, string> = {
  size: "Size",
  type: "Type",
};

export const DEFAULT_SIZE_LABELS = ["32mm", "40mm", "75mm", "150mm"] as const;

export function groupDisplayName(group: ProductOptionGroup): string {
  if (group.kind === "custom") {
    return group.name.trim() || "Option";
  }
  return KIND_DEFAULT_NAMES[group.kind];
}

export function defaultNameForKind(kind: VariationKind): string {
  return kind === "custom" ? "" : KIND_DEFAULT_NAMES[kind];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createVariantGroup(kind: VariationKind): ProductOptionGroup {
  return {
    id: newId("group"),
    kind,
    name: defaultNameForKind(kind),
    options:
      kind === "size"
        ? DEFAULT_SIZE_LABELS.map((label) => createVariantOption(label))
        : [],
  };
}

export function createVariantOption(label = ""): ProductVariantOption {
  const base = slugify(label) || "option";
  return {
    id: `${base}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    priceDeltaCents: 0,
  };
}

function parseJsonValue(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function isLegacyVariant(value: unknown): value is ProductVariant {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "label" in value &&
    typeof (value as ProductVariant).id === "string" &&
    typeof (value as ProductVariant).label === "string"
  );
}

function isStoredVariantsV2(value: unknown): value is StoredVariantsV2 {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as StoredVariantsV2).version === 2 &&
    Array.isArray((value as StoredVariantsV2).groups)
  );
}

/** Parse DynamoDB/AppSync JSON into admin-editable option groups. */
export function parseVariantGroups(raw: unknown): ProductOptionGroup[] {
  const parsed = parseJsonValue(raw);
  if (!parsed) return [];

  if (isStoredVariantsV2(parsed)) {
    return parsed.groups.map(normalizeGroup);
  }

  if (Array.isArray(parsed)) {
    const first = parsed[0];
    if (
      first &&
      typeof first === "object" &&
      "options" in first &&
      Array.isArray((first as ProductOptionGroup).options)
    ) {
      return parsed.map((group) => normalizeGroup(group as ProductOptionGroup));
    }

    const legacy = parsed.filter(isLegacyVariant);
    if (legacy.length === 0) return [];
    return [
      {
        id: "legacy-size",
        kind: "size",
        name: "Size",
        options: legacy.map((option) => ({
          id: option.id,
          label: option.label,
          priceDeltaCents: option.priceDeltaCents ?? 0,
        })),
      },
    ];
  }

  return [];
}

function normalizeOption(option: ProductVariantOption): ProductVariantOption {
  const imageRef = option.imageRef?.trim();
  return {
    id: option.id || createVariantOption(option.label).id,
    label: option.label ?? "",
    priceDeltaCents: option.priceDeltaCents ?? 0,
    ...(imageRef ? { imageRef: normalizeImageRef(imageRef) } : {}),
  };
}

function normalizeGroup(group: ProductOptionGroup): ProductOptionGroup {
  return {
    id: group.id || newId("group"),
    kind: group.kind ?? "custom",
    name: group.name ?? "",
    options: (group.options ?? []).map(normalizeOption),
  };
}

export function serializeVariantGroups(
  groups: ProductOptionGroup[],
): StoredVariantsV2 | null {
  const normalized = groups
    .map(normalizeGroup)
    .map((group) => ({
      ...group,
      name: group.kind === "custom" ? group.name.trim() : defaultNameForKind(group.kind),
      options: group.options.filter((option) => option.label.trim()),
    }))
    .filter((group) => group.options.length > 0);

  if (normalized.length === 0) return null;
  return { version: 2, groups: normalized };
}

/** Flatten groups to storefront/cart variants (cartesian product when multiple groups). */
export function flattenVariantGroups(
  groups: ProductOptionGroup[],
): ProductVariant[] {
  const normalized = groups
    .map(normalizeGroup)
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => option.label.trim()),
    }))
    .filter((group) => group.options.length > 0);

  if (normalized.length === 0) return [];
  if (normalized.length === 1) {
    return normalized[0].options.map((option) => ({
      id: option.id,
      label: option.label,
      priceDeltaCents: option.priceDeltaCents,
    }));
  }

  let combos: ProductVariant[] = [{ id: "base", label: "", priceDeltaCents: 0 }];

  for (const group of normalized) {
    const next: ProductVariant[] = [];
    for (const combo of combos) {
      for (const option of group.options) {
        const id =
          combo.id === "base" ? option.id : `${combo.id}--${option.id}`;
        const label =
          combo.label === ""
            ? option.label
            : `${combo.label} / ${option.label}`;
        next.push({
          id,
          label,
          priceDeltaCents: combo.priceDeltaCents + option.priceDeltaCents,
        });
      }
    }
    combos = next;
  }

  return combos;
}

export function buildSelectedVariant(
  groups: ProductOptionGroup[],
  selectedByGroupId: Record<string, string>,
): ProductVariant | undefined {
  const variants = buildSelectedVariants(
    groups,
    Object.fromEntries(
      Object.entries(selectedByGroupId).map(([groupId, optionId]) => [
        groupId,
        [optionId],
      ]),
    ),
  );
  return variants[0];
}

/** Empty multi-select state — shoppers choose which options to include. */
export function initialVariantMultiSelection(
  groups: ProductOptionGroup[],
): Record<string, string[]> {
  const selection: Record<string, string[]> = {};
  for (const group of groups) {
    if (group.options.length > 0) {
      selection[group.id] = [];
    }
  }
  return selection;
}

export function toggleVariantMultiSelection(
  selection: Record<string, string[]>,
  groupId: string,
  optionId: string,
): Record<string, string[]> {
  const current = selection[groupId] ?? [];
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId];
  return { ...selection, [groupId]: next };
}

/** Build cart variants from multi-select (cartesian product across groups). */
export function buildSelectedVariants(
  groups: ProductOptionGroup[],
  selectedByGroupId: Record<string, string[]>,
): ProductVariant[] {
  const normalized = groups
    .map(normalizeGroup)
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        (selectedByGroupId[group.id] ?? []).includes(option.id),
      ),
    }))
    .filter((group) => group.options.length > 0);

  if (normalized.length === 0) return [];

  let combos: ProductVariant[] = [{ id: "base", label: "", priceDeltaCents: 0 }];

  for (const group of normalized) {
    const next: ProductVariant[] = [];
    for (const combo of combos) {
      for (const option of group.options) {
        const id =
          combo.id === "base" ? option.id : `${combo.id}--${option.id}`;
        const label =
          combo.label === ""
            ? option.label
            : `${combo.label} / ${option.label}`;
        next.push({
          id,
          label,
          priceDeltaCents: combo.priceDeltaCents + option.priceDeltaCents,
        });
      }
    }
    combos = next;
  }

  return combos;
}

export function initialVariantSelection(
  groups: ProductOptionGroup[],
): Record<string, string> {
  const selection: Record<string, string> = {};
  for (const group of groups) {
    if (group.options[0]) {
      selection[group.id] = group.options[0].id;
    }
  }
  return selection;
}

export function validateVariantGroups(groups: ProductOptionGroup[]): string | null {
  for (const group of groups) {
    const name = groupDisplayName(group);
    const filled = group.options.filter((option) => option.label.trim());
    if (filled.length === 0) continue;
    if (group.kind === "custom" && !group.name.trim()) {
      return "Custom variations need a name.";
    }
    for (const option of filled) {
      if (option.priceDeltaCents < 0) {
        return `${name}: price adjustments cannot be negative.`;
      }
    }
  }
  return null;
}

/** Drop photo links that no longer exist in the product gallery. */
export function stripInvalidVariantImageRefs(
  groups: ProductOptionGroup[],
  galleryImages: string[],
): ProductOptionGroup[] {
  const gallery = new Set(galleryImages.map(normalizeImageRef));
  return groups.map((group) => ({
    ...group,
    options: group.options.map((option) => {
      if (!option.imageRef) return option;
      const ref = normalizeImageRef(option.imageRef);
      return gallery.has(ref) ? { ...option, imageRef: ref } : { ...option, imageRef: undefined };
    }),
  }));
}

/** Linked photo for multi-select — prefers the most recently toggled option. */
export function selectedVariantImageRef(
  groups: ProductOptionGroup[],
  selectedByGroupId: Record<string, string[]>,
  preferOptionId?: string,
): string | undefined {
  if (preferOptionId) {
    for (const group of groups) {
      const option = group.options.find((item) => item.id === preferOptionId);
      if (option?.imageRef) return normalizeImageRef(option.imageRef);
    }
  }

  for (const group of groups) {
    for (const selectedId of selectedByGroupId[group.id] ?? []) {
      const option = group.options.find((item) => item.id === selectedId);
      if (option?.imageRef) return normalizeImageRef(option.imageRef);
    }
  }
  return undefined;
}

export function findGalleryIndexForImageRef(
  imageRefs: string[],
  imageRef: string | undefined,
): number {
  if (!imageRef) return -1;
  const normalized = normalizeImageRef(imageRef);
  return imageRefs.findIndex((ref) => normalizeImageRef(ref) === normalized);
}

export const VARIANT_OPTION_DRAG_TYPE =
  "application/x-emperium-variant-option";

export function moveVariantOption(
  options: ProductVariantOption[],
  fromIndex: number,
  toIndex: number,
): ProductVariantOption[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= options.length
  ) {
    return options;
  }

  const next = [...options];
  const [item] = next.splice(fromIndex, 1);
  const clampedTo = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clampedTo, 0, item);
  return next;
}

export function moveVariantOptionsInGroup(
  groups: ProductOptionGroup[],
  groupId: string,
  fromIndex: number,
  toIndex: number,
): ProductOptionGroup[] {
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          options: moveVariantOption(group.options, fromIndex, toIndex),
        }
      : group,
  );
}
