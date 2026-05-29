import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";

export type SculptorRecord = Schema["Sculptor"]["type"];

export async function listActiveSculptors(
  client: AmplifyDataClient,
): Promise<SculptorRecord[]> {
  const rows: SculptorRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Sculptor.list({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row && row.active !== false) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort((a, b) => {
    const orderDiff = Number(b.sortOrder ?? 0) - Number(a.sortOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

export async function listAllSculptors(
  client: AmplifyDataClient,
): Promise<SculptorRecord[]> {
  const rows: SculptorRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Sculptor.list({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort((a, b) => {
    const orderDiff = Number(b.sortOrder ?? 0) - Number(a.sortOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

export async function getSculptorBySlug(
  client: AmplifyDataClient,
  slug: string,
): Promise<SculptorRecord | null> {
  const { data, errors } = await client.models.Sculptor.get({ slug });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data ?? null;
}
