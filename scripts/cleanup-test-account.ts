/**
 * Delete orders, promo grants, and notifications for test customer account(s).
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-account.ts pramos074@hotmail.com
 *   npx tsx scripts/cleanup-test-account.ts a@example.com b@example.com
 *   npx tsx scripts/cleanup-test-account.ts pramos074@hotmail.com --purge-cancelled-failed
 *
 * Requires admin Cognito sign-in (ADMIN_PASSWORD or default from reset-promo-data).
 * Orders / return requests use GraphQL delete when allowed; otherwise AWS CLI DynamoDB delete.
 */
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { signIn } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

Amplify.configure(outputs);

const ADMIN_EMAIL = "admin@emperiumforgeworks.com";
const args = process.argv.slice(2);
const PURGE_CANCELLED_FAILED = args.includes("--purge-cancelled-failed");
const TARGET_EMAILS = args
  .filter((arg) => !arg.startsWith("--"))
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

async function listAll<T extends { id: string }>(
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

function resolveUserIdViaCognito(email: string, region: string): string | undefined {
  const userPoolId = outputs.auth?.user_pool_id;
  if (!userPoolId) return undefined;

  const raw = execSync(
    `aws cognito-idp list-users --user-pool-id ${userPoolId} --region ${region} --output json`,
    { encoding: "utf8" },
  );
  const users = (JSON.parse(raw).Users ?? []) as {
    Username?: string;
    Attributes?: { Name?: string; Value?: string }[];
  }[];

  const user = users.find((row) =>
    row.Attributes?.some(
      (attr) => attr.Name === "email" && attr.Value?.toLowerCase() === email,
    ),
  );
  if (!user) return undefined;

  return (
    user.Attributes?.find((attr) => attr.Name === "sub")?.Value ?? user.Username
  );
}

function findTableName(prefix: string, region: string): string {
  const raw = execSync(`aws dynamodb list-tables --region ${region} --output json`, {
    encoding: "utf8",
  });
  const tables = (JSON.parse(raw).TableNames ?? []) as string[];
  const match = tables.find(
    (name) => name.startsWith(`${prefix}-`) && name.endsWith("-NONE"),
  );
  if (!match) {
    throw new Error(`Could not find ${prefix} DynamoDB table in ${region}.`);
  }
  return match;
}

function deleteViaDynamoCli(
  tableName: string,
  key: Record<string, { S: string }>,
  region: string,
  label: string,
): void {
  const keyFile = join(tmpdir(), `dynamo-delete-${label}.json`);
  writeFileSync(keyFile, JSON.stringify(key), "utf8");
  try {
    execSync(
      `aws dynamodb delete-item --table-name ${tableName} --key file://${keyFile.replace(/\\/g, "/")} --region ${region}`,
      { stdio: "inherit" },
    );
  } finally {
    unlinkSync(keyFile);
  }
}

function scanByUserId(
  tableName: string,
  userId: string,
  region: string,
): Record<string, { S?: string }>[] {
  const valuesFile = join(tmpdir(), `scan-user-${userId}.json`);
  writeFileSync(valuesFile, JSON.stringify({ ":uid": { S: userId } }), "utf8");
  try {
    const raw = execSync(
      `aws dynamodb scan --table-name ${tableName} --region ${region} --filter-expression "userId = :uid" --expression-attribute-values file://${valuesFile.replace(/\\/g, "/")} --output json`,
      { encoding: "utf8" },
    );
    return (JSON.parse(raw).Items ?? []) as Record<string, { S?: string }>[];
  } finally {
    unlinkSync(valuesFile);
  }
}

function deleteOrderViaDynamoCli(
  orderId: string,
  tableName: string,
  region: string,
): void {
  deleteViaDynamoCli(tableName, { id: { S: orderId } }, region, `order-${orderId}`);
}

async function deleteOrder(
  client: ReturnType<typeof generateClient<Schema>>,
  order: Schema["Order"]["type"],
  orderTable: string | undefined,
  region: string,
): Promise<string | undefined> {
  const { errors } = await client.models.Order.delete({ id: order.id });
  if (errors?.length) {
    const msg = errors.map((e) => e.message).join("; ");
    if (
      msg.toLowerCase().includes("not authorized") ||
      msg.toLowerCase().includes("unauthorized")
    ) {
      const table = orderTable ?? findTableName("Order", region);
      console.log(`  GraphQL delete denied for ${order.id}; using DynamoDB...`);
      deleteOrderViaDynamoCli(order.id, table, region);
      return table;
    }
    throw new Error(`Failed to delete order ${order.id}: ${msg}`);
  }
  console.log(
    `  Deleted order ${order.id} (${order.status ?? "unknown"}, ${order.fulfillmentStatus ?? "no fulfillment"})`,
  );
  return orderTable;
}

async function deleteReturnRequest(
  client: ReturnType<typeof generateClient<Schema>>,
  returnRequest: Schema["ReturnRequest"]["type"],
  table: string | undefined,
  region: string,
): Promise<string | undefined> {
  if (client.models.ReturnRequest) {
    const { errors } = await client.models.ReturnRequest.delete({
      id: returnRequest.id,
    });
    if (!errors?.length) {
      console.log(`  Deleted return request ${returnRequest.id}`);
      return table;
    }
    const msg = errors.map((e) => e.message).join("; ");
    if (
      !msg.toLowerCase().includes("not authorized") &&
      !msg.toLowerCase().includes("unauthorized")
    ) {
      throw new Error(`Failed to delete return request ${returnRequest.id}: ${msg}`);
    }
  }

  const resolvedTable = table ?? findTableName("ReturnRequest", region);
  deleteViaDynamoCli(
    resolvedTable,
    { id: { S: returnRequest.id } },
    region,
    `return-${returnRequest.id}`,
  );
  console.log(`  Deleted return request ${returnRequest.id} (DynamoDB)`);
  return resolvedTable;
}

async function deletePromoGrant(
  client: ReturnType<typeof generateClient<Schema>>,
  grant: Schema["PromoGrant"]["type"],
  table: string | undefined,
  region: string,
): Promise<string | undefined> {
  if (client.models.PromoGrant) {
    const { errors } = await client.models.PromoGrant.delete({ id: grant.id });
    if (!errors?.length) {
      console.log(
        `  Deleted promo grant ${grant.id} (${grant.source ?? "unknown source"})`,
      );
      return table;
    }
    const msg = errors.map((e) => e.message).join("; ");
    if (
      !msg.toLowerCase().includes("not authorized") &&
      !msg.toLowerCase().includes("unauthorized")
    ) {
      throw new Error(`Failed to delete promo grant ${grant.id}: ${msg}`);
    }
  }

  const resolvedTable = table ?? findTableName("PromoGrant", region);
  deleteViaDynamoCli(
    resolvedTable,
    { id: { S: grant.id } },
    region,
    `grant-${grant.id}`,
  );
  console.log(
    `  Deleted promo grant ${grant.id} (${grant.source ?? "unknown source"}, DynamoDB)`,
  );
  return resolvedTable;
}

async function cleanupEmail(
  client: ReturnType<typeof generateClient<Schema>>,
  allOrders: Schema["Order"]["type"][],
  allReturnRequests: Schema["ReturnRequest"]["type"][],
  allPromoGrants: Schema["PromoGrant"]["type"][],
  targetEmail: string,
  region: string,
): Promise<void> {
  console.log(`\n=== ${targetEmail} ===`);

  let userId: string | undefined;
  if (client.queries.lookupCustomerByEmail) {
    try {
      const { data, errors } = await client.queries.lookupCustomerByEmail({
        email: targetEmail,
      });
      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join("; "));
      }
      userId = data?.userId;
    } catch (err) {
      console.warn(
        `lookupCustomerByEmail failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  userId ??= resolveUserIdViaCognito(targetEmail, region);
  if (userId) {
    console.log(`Resolved ${targetEmail} → userId ${userId}`);
  } else {
    console.warn(`No Cognito user found for ${targetEmail}; matching by email only.`);
  }

  const targetOrders = allOrders.filter((order) => {
    const email = order.email?.trim().toLowerCase();
    if (email === targetEmail) return true;
    if (userId && order.userId === userId) return true;
    return false;
  });

  const targetOrderIds = new Set(targetOrders.map((order) => order.id));
  const targetReturnRequests = allReturnRequests.filter((row) => {
    if (targetOrderIds.has(row.orderId)) return true;
    if (userId && row.userId === userId) return true;
    const email = row.email?.trim().toLowerCase();
    return email === targetEmail;
  });

  const targetPromoGrants = userId
    ? allPromoGrants.filter((grant) => grant.userId === userId)
    : [];

  console.log(
    `Found ${targetOrders.length} order(s), ${targetReturnRequests.length} return request(s), ${targetPromoGrants.length} promo grant(s).`,
  );

  let returnTable: string | undefined;
  for (const returnRequest of targetReturnRequests) {
    returnTable = await deleteReturnRequest(
      client,
      returnRequest,
      returnTable,
      region,
    );
  }

  let orderTable: string | undefined;
  for (const order of targetOrders) {
    orderTable = await deleteOrder(client, order, orderTable, region);
  }

  let promoTable: string | undefined;
  for (const grant of targetPromoGrants) {
    promoTable = await deletePromoGrant(client, grant, promoTable, region);
  }

  if (userId) {
    const notificationTable = findTableName("Notification", region);
    const notificationReadTable = findTableName("NotificationRead", region);
    const targetNotes = scanByUserId(notificationTable, userId, region);
    console.log(`Found ${targetNotes.length} notification(s) for userId ${userId}.`);

    for (const note of targetNotes) {
      const id = note.id?.S;
      if (!id) continue;
      const title = note.title?.S ?? "(no title)";
      const kind = note.kind?.S ?? "system";
      if (client.models.Notification) {
        const { errors } = await client.models.Notification.delete({ id });
        if (!errors?.length) {
          console.log(`  Deleted notification ${id} (${kind}: ${title})`);
          continue;
        }
        const msg = errors.map((e) => e.message).join("; ");
        if (!msg.toLowerCase().includes("not authorized")) {
          throw new Error(`Failed to delete notification ${id}: ${msg}`);
        }
      }
      deleteViaDynamoCli(notificationTable, { id: { S: id } }, region, `notif-${id}`);
      console.log(`  Deleted notification ${id} (${kind}: ${title})`);
    }

    const reads = scanByUserId(notificationReadTable, userId, region);
    for (const read of reads) {
      const notificationId = read.notificationId?.S;
      if (!notificationId) continue;
      if (client.models.NotificationRead) {
        const { errors } = await client.models.NotificationRead.delete({
          notificationId,
          userId,
        });
        if (!errors?.length) continue;
      }
      deleteViaDynamoCli(
        notificationReadTable,
        { notificationId: { S: notificationId }, userId: { S: userId } },
        region,
        `notifread-${notificationId}`,
      );
    }
    if (reads.length) {
      console.log(`  Removed ${reads.length} notification read marker(s).`);
    }
  }

  console.log(`Cleanup complete for ${targetEmail}.`);
}

async function main() {
  if (!TARGET_EMAILS.length) {
    console.error(
      "Usage: npx tsx scripts/cleanup-test-account.ts <customer-email> [more-emails...] [--purge-cancelled-failed]",
    );
    process.exit(1);
  }

  const password = process.env.ADMIN_PASSWORD ?? "EmperiumForge2026!";
  const region =
    process.env.AWS_REGION ??
    outputs.data?.aws_region ??
    outputs.auth?.aws_region ??
    "us-east-1";

  console.log(`Signing in as ${ADMIN_EMAIL}...`);
  await signIn({ username: ADMIN_EMAIL, password });

  const client = generateClient<Schema>({ authMode: "userPool" });

  const orders = await listAll((args) => client.models.Order.list(args));
  const returnRequests = client.models.ReturnRequest
    ? await listAll((args) => client.models.ReturnRequest.list(args))
    : [];
  const promoGrants = client.models.PromoGrant
    ? await listAll((args) => client.models.PromoGrant.list(args))
    : [];

  for (const email of TARGET_EMAILS) {
    await cleanupEmail(
      client,
      orders,
      returnRequests,
      promoGrants,
      email,
      region,
    );
  }

  if (PURGE_CANCELLED_FAILED) {
    console.log("\n=== Purging all cancelled/failed orders ===");
    let orderTable: string | undefined;
    const terminalOrders = orders.filter(
      (order) => order.status === "cancelled" || order.status === "failed",
    );
    console.log(
      `Found ${terminalOrders.length} cancelled/failed order(s) to purge.`,
    );
    for (const order of terminalOrders) {
      orderTable = await deleteOrder(client, order, orderTable, region);
    }
  }

  console.log(`\nAll cleanup complete (${TARGET_EMAILS.join(", ")}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
