import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { Schema } from "../../data/resource";

type MetricRow = { key: string; label: string; value: string };
type DimensionRow = { name: string; value: string };
type TrendPoint = { date: string; sessions: number; users: number; pageViews: number };

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

type Ga4ReportRow = {
  dimensionValues?: { value?: string | null }[] | null;
  metricValues?: { value?: string | null }[] | null;
};

function toDimensionRows(rows: Ga4ReportRow[] | null | undefined): DimensionRow[] {
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

function decodeDate(yyyymmdd: string | null | undefined): string {
  const raw = (yyyymmdd ?? "").trim();
  if (!/^\d{8}$/.test(raw)) return raw || "Unknown";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function parseProductSlug(path: string): string | null {
  const normalized = path.split("?")[0]?.split("#")[0] ?? path;
  const match =
    normalized.match(/^\/product\/([^/]+)$/i) ??
    normalized.match(/^\/vault\/product\/([^/]+)$/i);
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1]).trim().toLowerCase();
}

function toProductInterestRows(
  rows: Ga4ReportRow[] | null | undefined,
): { topProducts: DimensionRow[]; lowProducts: DimensionRow[] } {
  const bySlug = new Map<string, number>();
  for (const row of rows ?? []) {
    const path = row.dimensionValues?.[0]?.value ?? "";
    const slug = parseProductSlug(path);
    if (!slug) continue;
    bySlug.set(slug, (bySlug.get(slug) ?? 0) + asNumber(row.metricValues?.[0]?.value));
  }

  const ranked = Array.from(bySlug.entries())
    .map(([slug, views]) => ({ slug, views }))
    .filter((row) => row.views > 0);

  const topProducts = ranked
    .slice()
    .sort((a, b) => b.views - a.views)
    .slice(0, 8)
    .map(({ slug, views }) => ({ name: slug, value: formatInteger(views) }));

  const lowProducts = ranked
    .slice()
    .sort((a, b) => a.views - b.views)
    .slice(0, 8)
    .map(({ slug, views }) => ({ name: slug, value: formatInteger(views) }));

  return { topProducts, lowProducts };
}

function rethrowGa4Error(err: unknown, propertyId: string, clientEmail: string): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("PERMISSION_DENIED")) {
    throw new Error(
      `GA4 denied access to property ${propertyId}. The GA4 web UI cannot invite service accounts — run "npm run grant:ga4-access" (see docs/ga4-admin-dashboard.md) to grant Viewer to ${clientEmail}.`,
    );
  }
  throw err instanceof Error ? err : new Error(message);
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

  try {
    return await fetchGa4Dashboard({
      propertyId,
      clientEmail,
      privateKey,
      startDate,
      endDate,
      cacheKey,
    });
  } catch (err) {
    rethrowGa4Error(err, propertyId, clientEmail);
  }
};

async function fetchGa4Dashboard({
  propertyId,
  clientEmail,
  privateKey,
  startDate,
  endDate,
  cacheKey,
}: {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
  startDate: string;
  endDate: string;
  cacheKey: string;
}): Promise<Schema["getGa4Dashboard"]["returnType"]> {
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

  const [
    trendResponse,
    pagePathsResponse,
    pagesResponse,
    sourcesResponse,
    devicesResponse,
    countriesResponse,
  ] =
    await Promise.all([
      analytics.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      }),
      analytics.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 250,
      }),
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

  const trend: TrendPoint[] = (trendResponse[0]?.rows ?? []).map((row) => ({
    date: decodeDate(row.dimensionValues?.[0]?.value),
    sessions: asNumber(row.metricValues?.[0]?.value),
    users: asNumber(row.metricValues?.[1]?.value),
    pageViews: asNumber(row.metricValues?.[2]?.value),
  }));
  const { topProducts, lowProducts } = toProductInterestRows(pagePathsResponse[0]?.rows);

  const payload: Schema["getGa4Dashboard"]["returnType"] = {
    startDate,
    endDate,
    metrics,
    trend,
    topProducts,
    lowProducts,
    topPages: toDimensionRows(pagesResponse[0]?.rows),
    topSources: toDimensionRows(sourcesResponse[0]?.rows),
    topDevices: toDimensionRows(devicesResponse[0]?.rows),
    topCountries: toDimensionRows(countriesResponse[0]?.rows),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  return payload;
}
