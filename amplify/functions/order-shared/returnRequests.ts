import type { Schema } from "../../data/resource";
import type { OrderSharedDataClient } from "./dataClient.js";
import { canCustomerRequestReturn, returnIneligibilityReason } from "./refunds.js";

type DataClient = OrderSharedDataClient;
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
  const returnModel = client.models.ReturnRequest;
  if (!returnModel) return null;

  do {
    const response = await returnModel.list({
      filter: { orderId: { eq: orderId } },
      limit: 25,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(
        response.errors.map((e: { message: string }) => e.message).join("; "),
      );
    }
    for (const row of response.data ?? []) {
      const request = row as ReturnRequestRecord | null;
      if (request && OPEN_STATUSES.has(request.status ?? "requested")) {
        return request;
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
      returnIneligibilityReason(order) ??
        "This order is not eligible for a return request.",
    );
  }
}
