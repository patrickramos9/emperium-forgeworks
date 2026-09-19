export function reorderList<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  const clampedTo = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clampedTo, 0, item);
  return next;
}

/**
 * Reorder a visible subset (e.g. category-filtered rows) and splice that new
 * relative order back into the full list, leaving non-visible items in place.
 */
export function reorderVisibleInList<T extends { id: string }>(
  all: T[],
  visible: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (visible.length === 0) return all;
  const reorderedVisible = reorderList(visible, fromIndex, toIndex);
  if (reorderedVisible === visible) return all;

  const visibleIds = new Set(visible.map((row) => row.id));
  let nextVisible = 0;
  return all.map((row) =>
    visibleIds.has(row.id) ? reorderedVisible[nextVisible++]! : row,
  );
}
