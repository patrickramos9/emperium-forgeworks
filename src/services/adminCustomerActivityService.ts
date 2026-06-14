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
  userId: string;
  email: string;
  name?: string;
  favorites: CustomerActivityProductRef[];
  cartLines: CartSnapshotLine[];
  cartUpdatedAt?: string;
};

type ProductLookup = Map<string, { title: string; slug: string }>;

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

async function listAllFavorites(
  client: AmplifyDataClient,
): Promise<Schema["Favorite"]["type"][]> {
  if (!hasFavoriteModel(client)) return [];

  const rows: Schema["Favorite"]["type"][] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.Favorite.list({
      limit: 100,
      nextToken,
    });
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

async function listAllCartSnapshots(
  client: AmplifyDataClient,
): Promise<Schema["CartSnapshot"]["type"][]> {
  if (!hasCartSnapshotModel(client)) return [];

  const rows: Schema["CartSnapshot"]["type"][] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.CartSnapshot.list({
      limit: 100,
      nextToken,
    });
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

function mergeCustomerRow(
  accountsById: Map<string, CustomerAccount>,
  userId: string,
): CustomerActivityRow {
  const account = accountsById.get(userId);
  return {
    userId,
    email: account?.email ?? "—",
    ...(account?.name ? { name: account.name } : {}),
    favorites: [],
    cartLines: [],
  };
}

export async function fetchCustomerActivity(
  client: AmplifyDataClient,
  products: { id: string; title: string; slug: string }[],
): Promise<CustomerActivityRow[]> {
  const [accounts, favorites, snapshots] = await Promise.all([
    fetchAllCustomerAccounts(client),
    listAllFavorites(client),
    listAllCartSnapshots(client),
  ]);

  const productsById = buildProductLookup(products);
  const accountsById = new Map(accounts.map((a) => [a.userId, a]));
  const rowsByUserId = new Map<string, CustomerActivityRow>();

  for (const account of accounts) {
    rowsByUserId.set(account.userId, mergeCustomerRow(accountsById, account.userId));
  }

  for (const favorite of favorites) {
    const userId = favorite.userId;
    if (!userId) continue;
    const row =
      rowsByUserId.get(userId) ?? mergeCustomerRow(accountsById, userId);
    row.favorites.push(
      resolveProductRef(
        favorite.productId,
        favorite.productSlug,
        productsById,
      ),
    );
    rowsByUserId.set(userId, row);
  }

  for (const snapshot of snapshots) {
    const userId = snapshot.userId;
    if (!userId) continue;
    const lines = parseSnapshotLineItems(snapshot.lineItems);
    if (!lines.length) continue;

    const row =
      rowsByUserId.get(userId) ?? mergeCustomerRow(accountsById, userId);
    row.cartLines = lines.map((line) => ({
      ...line,
      ...resolveProductRef(line.productId, line.slug, productsById),
    }));
    row.cartUpdatedAt = snapshot.updatedAt ?? undefined;
    rowsByUserId.set(userId, row);
  }

  return [...rowsByUserId.values()].sort((a, b) => {
    const aActive = a.favorites.length > 0 || a.cartLines.length > 0;
    const bActive = b.favorites.length > 0 || b.cartLines.length > 0;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return a.email.localeCompare(b.email);
  });
}
