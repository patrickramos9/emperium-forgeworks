import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import {
  applyFulfillmentStatus,
  effectiveFulfillmentStatus,
  updateShippedOrderShipping,
} from "../order-shared/fulfillment.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

type FulfillmentStatus = "paid" | "received" | "processing" | "shipped";

const VALID_STATUSES: FulfillmentStatus[] = [
  "paid",
  "received",
  "processing",
  "shipped",
];

export const handler: Schema["updateOrderFulfillment"]["functionHandler"] =
  async (event) => {
    const orderId = event.arguments.orderId;
    const targetStatus = event.arguments.fulfillmentStatus as FulfillmentStatus;

    if (!VALID_STATUSES.includes(targetStatus)) {
      throw new Error("Invalid fulfillment status.");
    }

    const { data: order, errors } = await dataClient.models.Order.get({
      id: orderId,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.status !== "paid") {
      throw new Error("Fulfillment updates require a paid order.");
    }

    const shippingInput = {
      carrier: event.arguments.carrier,
      trackingNumber: event.arguments.trackingNumber,
      trackingUrl: event.arguments.trackingUrl,
    };

    // Already shipped: allow correcting carrier / tracking without re-advancing.
    if (
      targetStatus === "shipped" &&
      effectiveFulfillmentStatus(order) === "shipped"
    ) {
      const result = await updateShippedOrderShipping(
        dataClient,
        order,
        shippingInput,
        { notifyCustomer: event.arguments.notifyCustomer === true },
      );

      return {
        success: true,
        fulfillmentStatus: result.order.fulfillmentStatus ?? "shipped",
        notificationSent: result.notificationSent,
        emailSent: result.emailSent,
      };
    }

    const result = await applyFulfillmentStatus(
      dataClient,
      order,
      targetStatus,
      shippingInput,
    );

    return {
      success: true,
      fulfillmentStatus: result.order.fulfillmentStatus ?? targetStatus,
      notificationSent: result.notificationSent,
      emailSent: result.emailSent,
    };
  };
