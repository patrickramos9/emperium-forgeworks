/** Display stored cents as a dollar string for admin inputs (e.g. 4299 → "42.99"). */
export function formatCentsForInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Parse a USD price string into integer cents for the API. */
export function parseDollarInputToCents(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Price is required.");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a valid price in US dollars (e.g. 42.99).");
  }

  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars <= 0) {
    throw new Error("Price must be greater than $0.");
  }

  return Math.round(dollars * 100);
}
