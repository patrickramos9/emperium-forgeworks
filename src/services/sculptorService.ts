import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import { normalizeSculptorSlug } from "@/lib/sculptorSlug";

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
  const trimmed = slug.trim();
  const candidates = [
    trimmed,
    normalizeSculptorSlug(trimmed),
  ].filter((value, index, array) => value && array.indexOf(value) === index);

  for (const candidate of candidates) {
    const { data, errors } = await client.models.Sculptor.get({ slug: candidate });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    if (data) return data;
  }

  return null;
}

/** Slug is the DynamoDB primary key — changing it requires recreate. */
export async function isSculptorSlugAvailable(
  client: AmplifyDataClient,
  slug: string,
  exceptSlug?: string,
): Promise<boolean> {
  const existing = await getSculptorBySlug(client, slug);
  if (!existing) return true;
  if (
    exceptSlug &&
    existing.slug.toLowerCase() === exceptSlug.toLowerCase()
  ) {
    return true;
  }
  return false;
}

export type SculptorSaveInput = {
  slug: string;
  name: string;
  description?: string;
  logo?: string;
  galleryImages?: string[];
  myMiniFactoryUrl?: string;
  patreonUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  xUrl?: string;
  active: boolean;
  sortOrder: number;
  editorUserId?: string | null;
};

export type SculptorProfileInput = {
  name: string;
  description?: string;
  logo?: string;
  galleryImages?: string[];
  myMiniFactoryUrl?: string;
  patreonUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  xUrl?: string;
};

export async function getSculptorForEditor(
  client: AmplifyDataClient,
  userId: string,
): Promise<SculptorRecord | null> {
  const rows: SculptorRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Sculptor.list({
      limit: 25,
      nextToken,
      filter: { editorUserId: { eq: userId } },
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows[0] ?? null;
}

export async function updateOwnSculptor(
  client: AmplifyDataClient,
  userId: string,
  slug: string,
  data: SculptorProfileInput,
): Promise<SculptorRecord> {
  const existing = await getSculptorBySlug(client, slug);
  if (!existing || existing.editorUserId !== userId) {
    throw new Error("You do not have permission to edit this profile.");
  }

  if (!data.name.trim()) {
    throw new Error("Name is required.");
  }

  const result = await client.models.Sculptor.update({
    slug,
    name: data.name.trim(),
    description: data.description,
    logo: data.logo,
    galleryImages: data.galleryImages,
    myMiniFactoryUrl: data.myMiniFactoryUrl,
    patreonUrl: data.patreonUrl,
    instagramUrl: data.instagramUrl,
    facebookUrl: data.facebookUrl,
    xUrl: data.xUrl,
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  if (!result.data) throw new Error("Could not update sculptor profile.");
  return result.data;
}

/** Admin-only: grant or revoke partner edit access. */
export async function assignSculptorEditor(
  client: AmplifyDataClient,
  slug: string,
  editorUserId: string | null,
): Promise<SculptorRecord> {
  const result = await client.models.Sculptor.update({
    slug,
    editorUserId,
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  if (!result.data) throw new Error("Could not update partner access.");
  return result.data;
}

/** Create, update, or rename (slug change recreates the record). */
export async function saveSculptor(
  client: AmplifyDataClient,
  options: {
    isNew: boolean;
    previousSlug?: string;
    data: SculptorSaveInput;
  },
): Promise<SculptorRecord> {
  const Sculptor = client.models.Sculptor;
  const { isNew, previousSlug, data } = options;

  const available = await isSculptorSlugAvailable(
    client,
    data.slug,
    isNew ? undefined : previousSlug,
  );
  if (!available) {
    throw new Error(`Slug "${data.slug}" is already in use.`);
  }

  if (isNew) {
    const result = await Sculptor.create(data);
    if (result.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }
    if (!result.data) throw new Error("Could not create sculptor.");
    return result.data;
  }

  const slugChanged =
    previousSlug && previousSlug.toLowerCase() !== data.slug.toLowerCase();

  if (slugChanged) {
    const existing = await getSculptorBySlug(client, previousSlug);
    const createResult = await Sculptor.create({
      ...data,
      editorUserId: existing?.editorUserId ?? undefined,
    });
    if (createResult.errors?.length) {
      throw new Error(createResult.errors.map((e) => e.message).join("; "));
    }
    if (!createResult.data) throw new Error("Could not rename sculptor.");

    const deleteResult = await Sculptor.delete({ slug: previousSlug });
    if (deleteResult.errors?.length) {
      throw new Error(deleteResult.errors.map((e) => e.message).join("; "));
    }
    return createResult.data;
  }

  const result = await Sculptor.update(data);
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  if (!result.data) throw new Error("Could not update sculptor.");
  return result.data;
}
