import type { generateClient } from "aws-amplify/data";
import type { Schema } from "../../data/resource";
import { canCustomerRequestReturn } from "./refunds.js";

type DataClient = ReturnType<typeof generateClient<Schema>>;
type OrderRecord = Schema["Order"]["type"];
type ReturnRequestRecord = Schema["ReturnRequest"]["type"];

const OPEN_STATUSES = new Set([
  "requested",
  "approved",
  "received",
]);

export async function getOpenReturnRequestForOrder(
  client: DataClient,
  orderId: string,
): Promise<ReturnRequestRecord | null> {
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
      if (row && OPEN_STATUSES.has(row.status ?? "requested")) {
        return row;
      }
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return null;
}

export function assertReturnEligible(
  order: OrderRecord,
  userId: string,
): void {
  if (order.userId !== userId) {
    throw new Error("Order not found.");
  }
  if (!canCustomerRequestReturn(order)) {
    throw new Error(
      "This order is not eligible for a return request. Returns are accepted within 30 days of delivery for paid orders that have shipped.",
    );
  }
}
