import type { Schema } from "../../data/resource";
import {
  expiresAtFromTemplateDays,
  isGrantOpen,
} from "./promoTemplateUtils.js";

type DataClient = ReturnType<
  typeof import("aws-amplify/data").generateClient<Schema>
>;

type PromoTemplate = Schema["PromoTemplate"]["type"];
type PromoGrant = Schema["PromoGrant"]["type"];

export async function listAllTemplates(
  client: DataClient,
): Promise<PromoTemplate[]> {
  const rows: PromoTemplate[] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.models.PromoTemplate.list({
      limit: 50,
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

export async function listGrantsForUser(
  client: DataClient,
  userId: string,
): Promise<PromoGrant[]> {
  const rows: PromoGrant[] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.models.PromoGrant.list({
      filter: { userId: { eq: userId } },
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

export function findActiveTemplate(
  templates: PromoTemplate[],
  flag:
    | "useForThankYou"
    | "useForFavorite"
    | "useForAbandonedCart"
    | "useForNewAccount",
): PromoTemplate | undefined {
  return templates.find((t) => t.active && t[flag]);
}

export async function hasGrantForSource(
  client: DataClient,
  userId: string,
  source: NonNullable<PromoGrant["source"]>,
): Promise<boolean> {
  const grants = await listGrantsForUser(client, userId);
  return grants.some((grant) => grant.source === source);
}

export async function hasOpenGrant(
  client: DataClient,
  userId: string,
  source: NonNullable<PromoGrant["source"]>,
  scope?: { productId?: string; cartSnapshotId?: string },
): Promise<boolean> {
  const grants = await listGrantsForUser(client, userId);
  return grants.some(
    (grant) =>
      grant.source === source &&
      isGrantOpen(grant) &&
      (scope?.productId == null || grant.productId === scope.productId) &&
      (scope?.cartSnapshotId == null ||
        grant.cartSnapshotId === scope.cartSnapshotId),
  );
}

function discountPreview(template: PromoTemplate): string {
  return template.kind === "percent"
    ? `${template.percent}% off`
    : `$${((template.amountCents ?? 0) / 100).toFixed(2)} off`;
}

export async function createPromoGrantWithNotification(
  client: DataClient,
  input: {
    template: PromoTemplate;
    userId: string;
    source: NonNullable<PromoGrant["source"]>;
    productId?: string;
    cartSnapshotId?: string;
    notification: { title: string; bodyPrefix: string };
  },
): Promise<PromoGrant | null> {
  const expiresAt = expiresAtFromTemplateDays(
    input.template.defaultExpiresInDays,
  );
  const grantResult = await client.models.PromoGrant.create({
    templateId: input.template.id,
    userId: input.userId,
    source: input.source,
    expiresAt,
    ...(input.productId ? { productId: input.productId } : {}),
    ...(input.cartSnapshotId ? { cartSnapshotId: input.cartSnapshotId } : {}),
  });
  if (grantResult.errors?.length) {
    throw new Error(grantResult.errors.map((e) => e.message).join("; "));
  }
  const grant = grantResult.data;
  if (!grant) return null;

  const expiryText =
    input.template.defaultExpiresInDays != null &&
    input.template.defaultExpiresInDays > 0
      ? ` Expires ${new Date(expiresAt).toLocaleDateString("en-US")}.`
      : "";

  const notificationResult = await client.models.Notification.create({
    title: input.notification.title,
    body: `${input.notification.bodyPrefix} ${input.template.name}: ${discountPreview(input.template)}.${expiryText} Applies automatically at checkout when signed in.`,
    kind: "marketing",
    userId: input.userId,
    active: true,
    sortOrder: 55,
  });
  if (notificationResult.errors?.length) {
    throw new Error(
      `Promo grant created but notification failed: ${notificationResult.errors.map((e) => e.message).join("; ")}`,
    );
  }

  return grant;
}

export async function issueFavoriteGrantIfNeeded(
  client: DataClient,
  userId: string,
  productId: string,
): Promise<boolean> {
  const templates = await listAllTemplates(client);
  const template = findActiveTemplate(templates, "useForFavorite");
  if (!template) return false;

  if (
    await hasOpenGrant(client, userId, "favorite", { productId })
  ) {
    return false;
  }

  await createPromoGrantWithNotification(client, {
    template,
    userId,
    source: "favorite",
    productId,
    notification: {
      title: "Thanks for saving this piece",
      bodyPrefix: "Your favorite earned an offer —",
    },
  });
  return true;
}

export async function issueNewAccountGrantIfNeeded(
  client: DataClient,
  userId: string,
): Promise<boolean> {
  const templates = await listAllTemplates(client);
  const template = findActiveTemplate(templates, "useForNewAccount");
  if (!template) return false;

  if (await hasGrantForSource(client, userId, "new_account")) {
    return false;
  }

  await createPromoGrantWithNotification(client, {
    template,
    userId,
    source: "new_account",
    notification: {
      title: "Welcome to the forge",
      bodyPrefix: "Thanks for creating an account —",
    },
  });
  return true;
}

export async function revokeOpenAbandonedCartGrants(
  client: DataClient,
  userId: string,
): Promise<number> {
  const grants = await listGrantsForUser(client, userId);
  const now = new Date().toISOString();
  let revoked = 0;

  for (const grant of grants) {
    if (grant.source !== "abandoned_cart" || !isGrantOpen(grant)) continue;
    const result = await client.models.PromoGrant.update({
      id: grant.id,
      revokedAt: now,
    });
    if (result.errors?.length) {
      throw new Error(
        `Failed to revoke abandon grant ${grant.id}: ${result.errors.map((e) => e.message).join("; ")}`,
      );
    }
    revoked += 1;
  }

  return revoked;
}

export async function issueAbandonedCartGrantIfNeeded(
  client: DataClient,
  userId: string,
  cartSnapshotId: string,
): Promise<boolean> {
  const templates = await listAllTemplates(client);
  const template = findActiveTemplate(templates, "useForAbandonedCart");
  if (!template) return false;

  if (
    await hasOpenGrant(client, userId, "abandoned_cart", {
      cartSnapshotId,
    })
  ) {
    return false;
  }

  await createPromoGrantWithNotification(client, {
    template,
    userId,
    source: "abandoned_cart",
    cartSnapshotId,
    notification: {
      title: "Your cart is waiting",
      bodyPrefix: "Welcome back —",
    },
  });
  return true;
}

/** Order.lineItems is a.json(); stored as stringified snapshots at checkout. */
function lineItemsJsonFromOrder(
  lineItems: Schema["Order"]["type"]["lineItems"],
): string | null | undefined {
  if (lineItems == null) return undefined;
  if (typeof lineItems === "string") return lineItems;
  return JSON.stringify(lineItems);
}

export async function reissueFavoriteGrantsAfterOrder(
  client: DataClient,
  userId: string,
  lineItems: Schema["Order"]["type"]["lineItems"],
): Promise<void> {
  const lineItemsJson = lineItemsJsonFromOrder(lineItems);
  if (!lineItemsJson) return;

  let items: { productId?: string }[];
  try {
    items = JSON.parse(lineItemsJson) as { productId?: string }[];
  } catch {
    return;
  }

  const productIds = [
    ...new Set(items.map((row) => row.productId).filter(Boolean)),
  ] as string[];

  for (const productId of productIds) {
    const fav = await client.models.Favorite.get({ userId, productId });
    if (fav.errors?.length || !fav.data) continue;
    await issueFavoriteGrantIfNeeded(client, userId, productId);
  }
}
