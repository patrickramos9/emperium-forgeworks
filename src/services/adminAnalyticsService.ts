import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";

export type Ga4DashboardResult = NonNullable<
  Schema["getGa4Dashboard"]["returnType"]
>;

const CACHE_PREFIX = "admin:ga4:";

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoIsoDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function cacheKey(startDate: string, endDate: string): string {
  return `${CACHE_PREFIX}${startDate}:${endDate}`;
}

export function readGa4Cache(
  startDate: string,
  endDate: string,
): Ga4DashboardResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(startDate, endDate));
    if (!raw) return null;
    return JSON.parse(raw) as Ga4DashboardResult;
  } catch {
    return null;
  }
}

export function writeGa4Cache(payload: Ga4DashboardResult): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      cacheKey(payload.startDate, payload.endDate),
      JSON.stringify(payload),
    );
  } catch {
    // Ignore cache write failures (private mode/quota limits).
  }
}

export async function fetchGa4Dashboard(
  client: AmplifyDataClient,
  startDate: string,
  endDate: string,
): Promise<Ga4DashboardResult> {
  const { data, errors } = await client.queries.getGa4Dashboard({
    startDate,
    endDate,
  });
  if (errors?.length) {
    throw new Error(errors.map((err) => err.message).join("; "));
  }
  if (!data) {
    throw new Error("No analytics data returned.");
  }
  return data as Ga4DashboardResult;
}
