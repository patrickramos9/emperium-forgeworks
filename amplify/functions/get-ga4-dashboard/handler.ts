import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { Schema } from "../../data/resource";

type MetricRow = { key: string; label: string; value: string };
type DimensionRow = { name: string; value: string };

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<
  string,
  { expiresAt: number; payload: Schema["getGa4Dashboard"]["returnType"] }
>();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function parseDate(input: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error("Dates must be YYYY-MM-DD.");
  }
  return input;
}

function asNumber(value: string | null | undefined): number {
  const num = Number(value ?? "0");
  return Number.isFinite(num) ? num : 0;
}

function formatInteger(value: number): string {
  return value.toLocaleString();
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function toDimensionRows(
  rows:
    | { dimensionValues?: { value?: string | null }[]; metricValues?: { value?: string | null }[] }[]
    | undefined,
): DimensionRow[] {
  return (rows ?? [])
    .map((row) => {
      const rawValue = asNumber(row.metricValues?.[0]?.value);
      return {
        name: row.dimensionValues?.[0]?.value?.trim() || "Unknown",
        value: formatInteger(rawValue),
        rawValue,
      };
    })
    .filter((row) => row.rawValue > 0)
    .map(({ name, value }) => ({ name, value }));
}

export const handler: Schema["getGa4Dashboard"]["functionHandler"] = async (
  event,
) => {
  const propertyId = requireEnv("GA4_PROPERTY_ID");
  const clientEmail = requireEnv("GA4_CLIENT_EMAIL");
  const privateKey = requireEnv("GA4_PRIVATE_KEY").replace(/\\n/g, "\n");
  const startDate = parseDate(event.arguments.startDate);
  const endDate = parseDate(event.arguments.endDate);
  const cacheKey = `${propertyId}:${startDate}:${endDate}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const analytics = new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
  const property = `properties/${propertyId}`;

  const [kpiResponse] = await analytics.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "activeUsers" },
      { name: "newUsers" },
      { name: "sessions" },
      { name: "engagedSessions" },
      { name: "engagementRate" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "screenPageViews" },
      { name: "eventCount" },
      { name: "conversions" },
    ],
  });

  const values = kpiResponse.rows?.[0]?.metricValues ?? [];
  const metrics: MetricRow[] = [
    { key: "activeUsers", label: "Active users", value: formatInteger(asNumber(values[0]?.value)) },
    { key: "newUsers", label: "New users", value: formatInteger(asNumber(values[1]?.value)) },
    { key: "sessions", label: "Sessions", value: formatInteger(asNumber(values[2]?.value)) },
    { key: "engagedSessions", label: "Engaged sessions", value: formatInteger(asNumber(values[3]?.value)) },
    { key: "engagementRate", label: "Engagement rate", value: formatPercent(asNumber(values[4]?.value)) },
    { key: "bounceRate", label: "Bounce rate", value: formatPercent(asNumber(values[5]?.value)) },
    { key: "averageSessionDuration", label: "Avg. session duration", value: formatDuration(asNumber(values[6]?.value)) },
    { key: "screenPageViews", label: "Page views", value: formatInteger(asNumber(values[7]?.value)) },
    { key: "eventCount", label: "Event count", value: formatInteger(asNumber(values[8]?.value)) },
    { key: "conversions", label: "Conversions", value: formatInteger(asNumber(values[9]?.value)) },
  ];

  const [pagesResponse, sourcesResponse, devicesResponse, countriesResponse] =
    await Promise.all([
      analytics.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 8,
      }),
      analytics.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      analytics.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 8,
      }),
      analytics.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 8,
      }),
    ]);

  const payload: Schema["getGa4Dashboard"]["returnType"] = {
    startDate,
    endDate,
    metrics,
    topPages: toDimensionRows(pagesResponse[0].rows),
    topSources: toDimensionRows(sourcesResponse[0].rows),
    topDevices: toDimensionRows(devicesResponse[0].rows),
    topCountries: toDimensionRows(countriesResponse[0].rows),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  return payload;
};
