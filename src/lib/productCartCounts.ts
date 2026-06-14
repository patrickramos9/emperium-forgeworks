type CartLineLike = {
  productId?: string | null;
  quantity?: number | null;
};

export function productIdsInCartLines(lines: CartLineLike[]): Set<string> {
  const ids = new Set<string>();
  for (const row of lines) {
    const productId = row.productId?.trim();
    if (productId && (row.quantity ?? 0) > 0) {
      ids.add(productId);
    }
  }
  return ids;
}
