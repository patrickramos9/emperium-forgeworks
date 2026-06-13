/**
 * Delete orders and notifications for a test customer account.
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-account.ts pramos074@hotmail.com
 *
 * Requires admin Cognito sign-in (ADMIN_PASSWORD or default from reset-promo-data).
 * Orders use GraphQL delete when allowed; otherwise AWS CLI DynamoDB delete.
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
const TARGET_EMAIL = (process.argv[2] ?? "").trim().toLowerCase();

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

async function main() {
  if (!TARGET_EMAIL) {
    console.error("Usage: npx tsx scripts/cleanup-test-account.ts <customer-email>");
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

  let userId: string | undefined;
  if (client.queries.lookupCustomerByEmail) {
    try {
      const { data, errors } = await client.queries.lookupCustomerByEmail({
        email: TARGET_EMAIL,
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

  userId ??= resolveUserIdViaCognito(TARGET_EMAIL, region);
  if (userId) {
    console.log(`Resolved ${TARGET_EMAIL} → userId ${userId}`);
  } else {
    console.warn(`No Cognito user found for ${TARGET_EMAIL}; matching orders by email only.`);
  }

  const orders = await listAll((args) => client.models.Order.list(args));
  const targetOrders = orders.filter((order) => {
    const email = order.email?.trim().toLowerCase();
    if (email === TARGET_EMAIL) return true;
    if (userId && order.userId === userId) return true;
    return false;
  });

  console.log(`Found ${targetOrders.length} order(s) for ${TARGET_EMAIL}.`);

  let orderTable: string | undefined;
  for (const order of targetOrders) {
    const { errors } = await client.models.Order.delete({ id: order.id });
    if (errors?.length) {
      const msg = errors.map((e) => e.message).join("; ");
      if (
        msg.toLowerCase().includes("not authorized") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        orderTable ??= findTableName("Order", region);
        console.log(`  GraphQL delete denied for ${order.id}; using DynamoDB...`);
        deleteOrderViaDynamoCli(order.id, orderTable, region);
        console.log(`  Deleted order ${order.id}`);
        continue;
      }
      throw new Error(`Failed to delete order ${order.id}: ${msg}`);
    }
    console.log(
      `  Deleted order ${order.id} (${order.status ?? "unknown"}, ${order.fulfillmentStatus ?? "no fulfillment"})`,
    );
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

  console.log(`Cleanup complete for ${TARGET_EMAIL}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
