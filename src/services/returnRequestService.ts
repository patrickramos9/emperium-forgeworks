import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import type { ReturnReason } from "@/lib/orderRefunds";
import type { OrderLineItemSnapshot } from "@/lib/orderLineItems";

export type ReturnRequestRecord = Schema["ReturnRequest"]["type"];

export type ReturnRequestLineItem = {
  productId: string;
  slug: string;
  title: string;
  quantity: number;
  variantLabel?: string;
};

export function parseReturnLineItems(
  raw: ReturnRequestRecord["lineItems"],
): ReturnRequestLineItem[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed as ReturnRequestLineItem[];
  } catch {
    return [];
  }
}

export function toReturnLineItems(
  items: OrderLineItemSnapshot[],
): ReturnRequestLineItem[] {
  return items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    title: item.title,
    quantity: item.quantity,
    ...(item.variantLabel ? { variantLabel: item.variantLabel } : {}),
  }));
}

export async function listReturnRequests(
  client: AmplifyDataClient,
): Promise<ReturnRequestRecord[]> {
  const rows: ReturnRequestRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.ReturnRequest.list({
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

  return rows.sort(
    (a, b) => Date.parse(b.requestedAt ?? "") - Date.parse(a.requestedAt ?? ""),
  );
}

export async function listReturnRequestsForOrder(
  client: AmplifyDataClient,
  orderId: string,
): Promise<ReturnRequestRecord[]> {
  const rows: ReturnRequestRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.ReturnRequest.list({
      filter: { orderId: { eq: orderId } },
      limit: 25,
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

  return rows.sort(
    (a, b) => Date.parse(b.requestedAt ?? "") - Date.parse(a.requestedAt ?? ""),
  );
}

export async function submitReturnRequest(
  client: AmplifyDataClient,
  input: {
    orderId: string;
    reason: ReturnReason;
    customerNotes?: string;
    lineItems: ReturnRequestLineItem[];
  },
): Promise<string> {
  if (!client.mutations.submitReturnRequest) {
    throw new Error(
      "Return requests are not deployed. Redeploy the Amplify backend.",
    );
  }

  const { data, errors } = await client.mutations.submitReturnRequest({
    orderId: input.orderId,
    reason: input.reason,
    lineItems: input.lineItems,
    ...(input.customerNotes ? { customerNotes: input.customerNotes } : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data?.returnRequestId) {
    throw new Error("Return request failed.");
  }

  return data.returnRequestId;
}

export type ReturnRequestStatus = NonNullable<
  ReturnRequestRecord["status"]
>;

export async function updateReturnRequest(
  client: AmplifyDataClient,
  input: {
    returnRequestId: string;
    status?: ReturnRequestStatus;
    adminNotes?: string;
  },
): Promise<ReturnRequestRecord> {
  if (!client.mutations.adminUpdateReturnRequest) {
    throw new Error(
      "Return request updates are not deployed. Redeploy the Amplify backend.",
    );
  }

  const { data, errors } = await client.mutations.adminUpdateReturnRequest({
    returnRequestId: input.returnRequestId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Return request update failed.");
  }

  const row = await client.models.ReturnRequest.get({
    id: input.returnRequestId,
  });
  if (row.errors?.length) {
    throw new Error(row.errors.map((e) => e.message).join("; "));
  }
  if (!row.data) {
    throw new Error("Return request not found after update.");
  }
  return row.data;
}
