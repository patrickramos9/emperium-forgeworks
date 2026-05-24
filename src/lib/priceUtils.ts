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

/** Parse a USD adjustment (0 or positive) into cents for variant price deltas. */
export function parsePriceAdjustmentToCents(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a valid adjustment (e.g. 15.00 or 0).");
  }

  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) {
    throw new Error("Adjustment cannot be negative.");
  }

  return Math.round(dollars * 100);
}

/** Format cents as a dollar string for adjustment inputs (allows 0). */
export function formatAdjustmentForInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
