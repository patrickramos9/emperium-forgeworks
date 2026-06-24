import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import {
  assertReturnEligible,
  getOpenReturnRequestForOrder,
} from "../order-shared/returnRequests.js";
import { getOrderById } from "../order-shared/stripeOrderStatus.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: Schema["submitReturnRequest"]["functionHandler"] =
  async (event) => {
    const userId =
      event.identity && "sub" in event.identity
        ? (event.identity.sub as string | undefined)
        : undefined;
    if (!userId) {
      throw new Error("Sign in to request a return.");
    }

    const orderId = event.arguments.orderId;
    const lineItems = event.arguments.lineItems;
    if (!lineItems?.length) {
      throw new Error("Select at least one item to return.");
    }

    const order = await getOrderById(dataClient, orderId);
    if (!order) {
      throw new Error("Order not found.");
    }

    assertReturnEligible(order, userId);

    const existing = await getOpenReturnRequestForOrder(dataClient, orderId);
    if (existing) {
      throw new Error(
        "A return request is already open for this order. Check your order details or contact support.",
      );
    }

    const now = new Date().toISOString();
    const { data, errors } = await dataClient.models.ReturnRequest.create({
      orderId,
      userId,
      email: order.email ?? undefined,
      status: "requested",
      reason: event.arguments.reason,
      customerNotes: event.arguments.customerNotes?.trim() || undefined,
      lineItems: JSON.stringify(lineItems),
      requestedAt: now,
    });

    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    if (!data) {
      throw new Error("Could not create return request.");
    }

    return {
      success: true,
      returnRequestId: data.id,
    };
  };
