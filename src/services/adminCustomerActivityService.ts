import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import {
  fetchAllCustomerAccounts,
  type CustomerAccount,
} from "@/lib/customerAdmin";
import { hasCartSnapshotModel, hasFavoriteModel } from "@/lib/dataModels";

export type CartSnapshotLine = {
  productId: string;
  slug: string;
  title: string;
  quantity: number;
};

export type CustomerActivityProductRef = {
  productId: string;
  title: string;
  slug: string;
};

export type CustomerActivityRow = {
  /** Cognito sub for signed-in rows; guest UUID for guest rows. */
  userId: string;
  /** Display label (email, or "Guest · abcd1234"). */
  email: string;
  name?: string;
  kind: "customer" | "guest";
  guestId?: string;
  favorites: CustomerActivityProductRef[];
  cartLines: CartSnapshotLine[];
  cartUpdatedAt?: string;
};

type ProductLookup = Map<string, { title: string; slug: string }>;

/** Unwrap Amplify/Dynamo JSON shapes into plain objects/arrays. */
function unwrapDynamoJson(raw: unknown): unknown {
  if (raw == null) return raw;
  if (Array.isArray(raw)) return raw.map(unwrapDynamoJson);
  if (typeof raw !== "object") return raw;

  const obj = raw as Record<string, unknown>;

  // DynamoDB AttributeValue wrappers
  if ("S" in obj && Object.keys(obj).length === 1) return obj.S;
  if ("N" in obj && Object.keys(obj).length === 1) {
    const n = Number(obj.N);
    return Number.isFinite(n) ? n : obj.N;
  }
  if ("BOOL" in obj && Object.keys(obj).length === 1) return obj.BOOL;
  if ("NULL" in obj) return null;
  if ("L" in obj && Array.isArray(obj.L)) {
    return (obj.L as unknown[]).map(unwrapDynamoJson);
  }
  if ("M" in obj && obj.M && typeof obj.M === "object") {
    return unwrapDynamoJson(obj.M);
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = unwrapDynamoJson(value);
  }
  return out;
}

function parseSnapshotLineItems(raw: unknown): CartSnapshotLine[] {
  if (!raw) return [];
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  parsed = unwrapDynamoJson(parsed);
  if (!Array.isArray(parsed)) return [];

  const lines: CartSnapshotLine[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const productId = String(
      (row as { productId?: string }).productId ?? "",
    ).trim();
    const quantity = Number((row as { quantity?: number }).quantity);
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;
    const slug =
      String((row as { slug?: string }).slug ?? "").trim() || productId;
    const title =
      String((row as { title?: string }).title ?? "").trim() || slug;
    lines.push({ productId, slug, title, quantity: Math.round(quantity) });
  }
  return lines;
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

function guestLabel(guestId: string, contactEmail?: string | null): string {
  const short = shortId(guestId);
  if (contactEmail?.trim()) {
    return `Guest · ${contactEmail.trim()} · ${short}`;
  }
  return `Guest · ${short}`;
}

function resolveProductRef(
  productId: string,
  slugHint: string | null | undefined,
  products: ProductLookup,
): CustomerActivityProductRef {
  const product = products.get(productId);
  if (product) return { productId, ...product };
  const slug = slugHint?.trim() || productId;
  return { productId, title: slug, slug };
}

async function listAllModelRows<T>(
  listFn: (args: {
    limit?: number;
    nextToken?: string;
  }) => Promise<{
    data?: (T | null)[] | null;
    errors?: { message: string }[] | null;
    nextToken?: string | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  let nextToken: string | undefined;
  do {
    const response = await listFn({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);
  return rows;
}

async function listAllFavorites(
  client: AmplifyDataClient,
): Promise<Schema["Favorite"]["type"][]> {
  if (!hasFavoriteModel(client) || !client.models.Favorite) return [];
  return listAllModelRows((args) => client.models.Favorite!.list(args));
}

async function listAllGuestFavorites(
  client: AmplifyDataClient,
): Promise<Schema["GuestFavorite"]["type"][]> {
  if (!client.models.GuestFavorite) return [];
  return listAllModelRows((args) => client.models.GuestFavorite!.list(args));
}

async function listAllCartSnapshots(
  client: AmplifyDataClient,
): Promise<Schema["CartSnapshot"]["type"][]> {
  if (!hasCartSnapshotModel(client) || !client.models.CartSnapshot) return [];
  return listAllModelRows((args) => client.models.CartSnapshot!.list(args));
}

async function listAllGuestCartSnapshots(
  client: AmplifyDataClient,
): Promise<Schema["GuestCartSnapshot"]["type"][]> {
  if (!client.models.GuestCartSnapshot) return [];
  return listAllModelRows((args) =>
    client.models.GuestCartSnapshot!.list(args),
  );
}

/** Best-effort contact email from guest print requests. */
async function guestEmailsByGuestId(
  client: AmplifyDataClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!client.models.PrintRequest) return map;

  const rows = await listAllModelRows((args) =>
    client.models.PrintRequest!.list(args),
  );
  for (const row of rows) {
    const guestId = row.guestId?.trim();
    const email = row.email?.trim().toLowerCase();
    if (!guestId || !email || map.has(guestId)) continue;
    map.set(guestId, email);
  }
  return map;
}

function buildProductLookup(
  products: { id: string; title: string; slug: string }[],
): ProductLookup {
  return new Map(
    products.map((product) => [
      product.id,
      { title: product.title, slug: product.slug },
    ]),
  );
}

function emptyCustomerRow(
  accountsById: Map<string, CustomerAccount>,
  userId: string,
): CustomerActivityRow {
  const account = accountsById.get(userId);
  return {
    userId,
    email: account?.email ?? `Account · ${shortId(userId)}`,
    ...(account?.name ? { name: account.name } : {}),
    kind: "customer",
    favorites: [],
    cartLines: [],
  };
}

function emptyGuestRow(
  guestId: string,
  contactEmail?: string | null,
): CustomerActivityRow {
  return {
    userId: guestId,
    guestId,
    email: guestLabel(guestId, contactEmail),
    kind: "guest",
    favorites: [],
    cartLines: [],
  };
}

export async function fetchCustomerActivity(
  client: AmplifyDataClient,
  products: { id: string; title: string; slug: string }[],
): Promise<CustomerActivityRow[]> {
  const [
    accounts,
    favorites,
    snapshots,
    guestFavorites,
    guestSnapshots,
    guestEmails,
  ] = await Promise.all([
    fetchAllCustomerAccounts(client),
    listAllFavorites(client),
    listAllCartSnapshots(client),
    listAllGuestFavorites(client),
    listAllGuestCartSnapshots(client),
    guestEmailsByGuestId(client),
  ]);

  const productsById = buildProductLookup(products);
  const accountsById = new Map(accounts.map((a) => [a.userId, a]));
  const rowsByKey = new Map<string, CustomerActivityRow>();

  for (const account of accounts) {
    rowsByKey.set(
      `customer:${account.userId}`,
      emptyCustomerRow(accountsById, account.userId),
    );
  }

  // Skip Cognito users who are not in the customer group (admin/staff
  // browsing the shop, leftover rows after an account was deleted).
  for (const favorite of favorites) {
    const userId = favorite.userId;
    if (!userId || !accountsById.has(userId)) continue;
    const key = `customer:${userId}`;
    const row =
      rowsByKey.get(key) ?? emptyCustomerRow(accountsById, userId);
    row.favorites.push(
      resolveProductRef(
        favorite.productId,
        favorite.productSlug,
        productsById,
      ),
    );
    rowsByKey.set(key, row);
  }

  for (const snapshot of snapshots) {
    const userId = snapshot.userId;
    if (!userId || !accountsById.has(userId)) continue;
    const lines = parseSnapshotLineItems(snapshot.lineItems);
    if (!lines.length) continue;

    const key = `customer:${userId}`;
    const row =
      rowsByKey.get(key) ?? emptyCustomerRow(accountsById, userId);
    row.cartLines = lines.map((line) => ({
      ...line,
      ...resolveProductRef(line.productId, line.slug, productsById),
    }));
    row.cartUpdatedAt = snapshot.updatedAt ?? undefined;
    rowsByKey.set(key, row);
  }

  for (const favorite of guestFavorites) {
    const guestId = favorite.guestId?.trim();
    if (!guestId) continue;
    const key = `guest:${guestId}`;
    const row =
      rowsByKey.get(key) ??
      emptyGuestRow(guestId, guestEmails.get(guestId));
    row.favorites.push(
      resolveProductRef(
        favorite.productId,
        favorite.productSlug,
        productsById,
      ),
    );
    rowsByKey.set(key, row);
  }

  for (const snapshot of guestSnapshots) {
    const guestId = snapshot.guestId?.trim();
    if (!guestId) continue;
    const lines = parseSnapshotLineItems(snapshot.lineItems);
    if (!lines.length) continue;

    const key = `guest:${guestId}`;
    const row =
      rowsByKey.get(key) ??
      emptyGuestRow(guestId, guestEmails.get(guestId));
    row.cartLines = lines.map((line) => ({
      ...line,
      ...resolveProductRef(line.productId, line.slug, productsById),
    }));
    row.cartUpdatedAt = snapshot.updatedAt ?? undefined;
    rowsByKey.set(key, row);
  }

  return [...rowsByKey.values()].sort((a, b) => {
    const aActive = a.favorites.length > 0 || a.cartLines.length > 0;
    const bActive = b.favorites.length > 0 || b.cartLines.length > 0;
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "customer" ? -1 : 1;
    return a.email.localeCompare(b.email);
  });
}
