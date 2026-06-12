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
