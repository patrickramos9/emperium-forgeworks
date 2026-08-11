import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import {
  hasGalleryEntryModel,
  requireGalleryEntryModel,
} from "@/lib/dataModels";
import { resolveImageUrl } from "@/lib/productImageUrls";

export type GalleryEntryRecord = {
  id: string;
  imagePath: string;
  imageUrl?: string;
  artistName: string;
  artistUrl: string | null;
  productSlug: string;
  receivedAt: string;
  active: boolean;
  sortOrder: number;
};

export type GalleryEntryInput = {
  imagePath: string;
  artistName: string;
  artistUrl?: string | null;
  productSlug: string;
  receivedAt: string;
  active?: boolean;
  sortOrder?: number;
};

function normalizeArtistUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function mapRow(row: {
  id: string;
  imagePath?: string | null;
  artistName?: string | null;
  artistUrl?: string | null;
  productSlug?: string | null;
  receivedAt?: string | null;
  active?: boolean | null;
  sortOrder?: number | null;
}): GalleryEntryRecord | null {
  const imagePath = row.imagePath?.trim();
  const artistName = row.artistName?.trim();
  const productSlug = row.productSlug?.trim();
  const receivedAt = row.receivedAt?.trim();
  if (!imagePath || !artistName || !productSlug || !receivedAt) return null;
  return {
    id: row.id,
    imagePath,
    artistName,
    artistUrl: normalizeArtistUrl(row.artistUrl),
    productSlug,
    receivedAt,
    active: row.active !== false,
    sortOrder: row.sortOrder ?? 0,
  };
}

function sortEntries(rows: GalleryEntryRecord[]): GalleryEntryRecord[] {
  return [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return Date.parse(b.receivedAt) - Date.parse(a.receivedAt);
  });
}

async function withResolvedImages(
  rows: GalleryEntryRecord[],
): Promise<GalleryEntryRecord[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      imageUrl: (await resolveImageUrl(row.imagePath)) ?? undefined,
    })),
  );
}

/** Public gallery — active entries only, newest received first (within sortOrder). */
export async function listActiveGalleryEntries(
  client: AmplifyDataClient,
): Promise<GalleryEntryRecord[]> {
  if (!hasGalleryEntryModel(client)) return [];

  const model = client.models.GalleryEntry!;
  const rows: GalleryEntryRecord[] = [];
  let nextToken: string | undefined;

  do {
    const { data, errors, nextToken: token } = await model.list({
      limit: 100,
      nextToken,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    for (const row of data ?? []) {
      if (!row) continue;
      const mapped = mapRow(row);
      if (mapped?.active) rows.push(mapped);
    }
    nextToken = token ?? undefined;
  } while (nextToken);

  return withResolvedImages(sortEntries(rows));
}

/** Admin list — includes inactive. */
export async function listAllGalleryEntries(
  client: AmplifyDataClient,
): Promise<GalleryEntryRecord[]> {
  const model = requireGalleryEntryModel(client);
  const rows: GalleryEntryRecord[] = [];
  let nextToken: string | undefined;

  do {
    const { data, errors, nextToken: token } = await model.list({
      limit: 100,
      nextToken,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    for (const row of data ?? []) {
      if (!row) continue;
      const mapped = mapRow(row);
      if (mapped) rows.push(mapped);
    }
    nextToken = token ?? undefined;
  } while (nextToken);

  return withResolvedImages(sortEntries(rows));
}

export async function createGalleryEntry(
  client: AmplifyDataClient,
  input: GalleryEntryInput,
): Promise<GalleryEntryRecord> {
  const model = requireGalleryEntryModel(client);
  const artistName = input.artistName.trim();
  const productSlug = input.productSlug.trim();
  const imagePath = input.imagePath.trim();
  const receivedAt = input.receivedAt.trim();
  if (!artistName || !productSlug || !imagePath || !receivedAt) {
    throw new Error("Image, artist name, product, and received date are required.");
  }

  const { data, errors } = await model.create({
    imagePath,
    artistName,
    artistUrl: normalizeArtistUrl(input.artistUrl),
    productSlug,
    receivedAt,
    active: input.active !== false,
    sortOrder: input.sortOrder ?? 0,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) throw new Error("Create gallery entry returned no data.");
  const mapped = mapRow(data);
  if (!mapped) throw new Error("Created gallery entry was incomplete.");
  return {
    ...mapped,
    imageUrl: (await resolveImageUrl(mapped.imagePath)) ?? undefined,
  };
}

export async function updateGalleryEntry(
  client: AmplifyDataClient,
  id: string,
  input: Partial<GalleryEntryInput> & { active?: boolean },
): Promise<GalleryEntryRecord> {
  const model = requireGalleryEntryModel(client);
  const payload: {
    id: string;
    imagePath?: string;
    artistName?: string;
    artistUrl?: string | null;
    productSlug?: string;
    receivedAt?: string;
    active?: boolean;
    sortOrder?: number;
  } = { id };

  if (input.imagePath != null) payload.imagePath = input.imagePath.trim();
  if (input.artistName != null) payload.artistName = input.artistName.trim();
  if (input.artistUrl !== undefined) {
    payload.artistUrl = normalizeArtistUrl(input.artistUrl);
  }
  if (input.productSlug != null) payload.productSlug = input.productSlug.trim();
  if (input.receivedAt != null) payload.receivedAt = input.receivedAt.trim();
  if (input.active !== undefined) payload.active = input.active;
  if (input.sortOrder !== undefined) payload.sortOrder = input.sortOrder;

  const { data, errors } = await model.update(payload);
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) throw new Error("Update gallery entry returned no data.");
  const mapped = mapRow(data);
  if (!mapped) throw new Error("Updated gallery entry was incomplete.");
  return {
    ...mapped,
    imageUrl: (await resolveImageUrl(mapped.imagePath)) ?? undefined,
  };
}

export async function deleteGalleryEntry(
  client: AmplifyDataClient,
  id: string,
): Promise<void> {
  const model = requireGalleryEntryModel(client);
  const { errors } = await model.delete({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

/** Format receivedAt for display (local date). */
export function formatGalleryReceivedDate(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}

/** Date input value (YYYY-MM-DD) from ISO datetime. */
export function galleryReceivedDateInputValue(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

/** Convert YYYY-MM-DD to ISO datetime at noon UTC (stable calendar day). */
export function galleryReceivedAtFromDateInput(dateValue: string): string {
  const trimmed = dateValue.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Received date must be YYYY-MM-DD.");
  }
  return `${trimmed}T12:00:00.000Z`;
}
