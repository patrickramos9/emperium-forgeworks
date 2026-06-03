import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { listAllOrders } from "@/services/orderService";

export type CustomerAccount = {
  userId: string;
  email: string;
};

/** Email plus best available display name (checkout name when present). */
export type CustomerLabel = {
  email: string;
  displayName: string;
};

export async function fetchCustomerAccounts(
  client: AmplifyDataClient,
  options: {
    emailFilter?: string;
    nextToken?: string;
    limit?: number;
  } = {},
): Promise<{ items: CustomerAccount[]; nextToken?: string | null }> {
  const { data, errors } = await client.queries.listCustomers({
    emailFilter: options.emailFilter?.trim() || undefined,
    nextToken: options.nextToken,
    limit: options.limit ?? 25,
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  const items = (data?.items ?? []).filter(
    (row): row is CustomerAccount =>
      Boolean(row?.userId && row?.email),
  );

  return {
    items,
    nextToken: data?.nextToken,
  };
}

/** Loads all customer accounts (paginated). */
export async function fetchAllCustomerAccounts(
  client: AmplifyDataClient,
): Promise<CustomerAccount[]> {
  const rows: CustomerAccount[] = [];
  let nextToken: string | undefined;

  do {
    const page = await fetchCustomerAccounts(client, {
      nextToken,
      limit: 60,
    });
    rows.push(...page.items);
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);

  return rows;
}

/**
 * Resolves human-readable labels for Cognito user ids (email, checkout name).
 */
export async function resolveCustomerLabelsForUserIds(
  client: AmplifyDataClient,
  userIds: string[],
): Promise<Map<string, CustomerLabel>> {
  const wanted = new Set(userIds.filter(Boolean));
  const labels = new Map<string, CustomerLabel>();
  if (!wanted.size) return labels;

  const accounts = await fetchAllCustomerAccounts(client);
  for (const account of accounts) {
    if (!wanted.has(account.userId)) continue;
    labels.set(account.userId, {
      email: account.email,
      displayName: account.email,
    });
  }

  const orders = await listAllOrders(client);
  for (const order of orders) {
    const uid = order.userId;
    if (!uid || !wanted.has(uid)) continue;

    const existing = labels.get(uid);
    const orderEmail = order.email?.trim();
    if (!existing && orderEmail) {
      labels.set(uid, { email: orderEmail, displayName: orderEmail });
    } else if (existing && orderEmail && !existing.email) {
      labels.set(uid, { ...existing, email: orderEmail });
    }
  }

  const nameSet = new Set<string>();
  for (const order of orders) {
    const uid = order.userId;
    const customerName = order.customerName?.trim();
    if (!uid || !wanted.has(uid) || !customerName || nameSet.has(uid)) continue;

    const existing = labels.get(uid) ?? {
      email: order.email?.trim() ?? "",
      displayName: customerName,
    };
    labels.set(uid, { ...existing, displayName: customerName });
    nameSet.add(uid);
  }

  return labels;
}
