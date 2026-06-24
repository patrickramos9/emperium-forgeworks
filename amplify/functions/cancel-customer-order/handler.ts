import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";
import { assertCustomerCanCancelOrder } from "../order-shared/refunds.js";
import { issueOrderRefund } from "../order-shared/issueOrderRefund.js";
import { getOrderById } from "../order-shared/stripeOrderStatus.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: Schema["cancelCustomerOrder"]["functionHandler"] =
  async (event) => {
    const userId =
      event.identity && "sub" in event.identity
        ? (event.identity.sub as string | undefined)
        : undefined;
    if (!userId) {
      throw new Error("Sign in to cancel an order.");
    }

    const orderId = event.arguments.orderId;
    const order = await getOrderById(dataClient, orderId);
    if (!order) {
      throw new Error("Order not found.");
    }

    assertCustomerCanCancelOrder(order, userId);

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const stripe =
      order.paymentProvider === "stripe" && secretKey
        ? new Stripe(secretKey)
        : undefined;

    if (order.paymentProvider === "stripe" && !stripe) {
      throw new Error("Stripe is not configured.");
    }

    const result = await issueOrderRefund(dataClient, order, {
      reason: "requested_by_customer",
      refundNotes: "Customer cancelled before shipment.",
      source: "customer_cancel",
      stripe,
    });

    return {
      success: true,
      refundId: result.refundId,
      refundedCents: result.refundedCents,
      orderStatus: result.orderStatus,
    };
  };
