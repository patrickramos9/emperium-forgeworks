import type { AmplifyDataClient } from "@/lib/amplifyDataClient";

export async function fetchPaidSalesCount(
  client: AmplifyDataClient,
): Promise<number | null> {
  if (!client.queries.getStorefrontStats) {
    return null;
  }

  const { data, errors } = await client.queries.getStorefrontStats();
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return data?.paidSalesCount ?? null;
}

export function formatSuccessfulForgings(count: number | null): string {
  if (count === null) return "—";
  return String(count);
}
