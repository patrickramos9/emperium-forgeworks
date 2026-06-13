import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import { sendSupportOrderEmail } from "../order-shared/notifySupport.js";
import { applyFulfillmentStatus } from "../order-shared/fulfillment.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: Schema["notifyOrderPlaced"]["functionHandler"] = async (
  event,
) => {
  const orderId = event.arguments.orderId;
  const { data: order, errors } = await dataClient.models.Order.get({
    id: orderId,
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!order || order.status !== "paid") {
    return { notified: false };
  }

  if (!order.supportNotifiedAt) {
    const sent = await sendSupportOrderEmail(order);
    if (sent) {
      await dataClient.models.Order.update({
        id: orderId,
        supportNotifiedAt: new Date().toISOString(),
      });
    }
  }

  if (!order.fulfillmentStatus) {
    try {
      await applyFulfillmentStatus(dataClient, order, "paid");
    } catch (err) {
      console.error("Fulfillment paid transition failed", err);
    }
  }

  return { notified: true };
};
