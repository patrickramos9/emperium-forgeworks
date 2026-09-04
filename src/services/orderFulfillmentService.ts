import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { FulfillmentStatus } from "@/lib/orderFulfillment";

export type UpdateFulfillmentInput = {
  orderId: string;
  fulfillmentStatus: FulfillmentStatus;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  /** When correcting shipping on an already-shipped order, notify the customer in-app. */
  notifyCustomer?: boolean;
};

export type UpdateFulfillmentResult = {
  success: boolean;
  fulfillmentStatus: string;
  notificationSent: boolean;
  emailSent: boolean;
};

export async function updateOrderFulfillment(
  client: AmplifyDataClient,
  input: UpdateFulfillmentInput,
): Promise<UpdateFulfillmentResult> {
  if (!client.mutations.updateOrderFulfillment) {
    throw new Error(
      "Order fulfillment updates are not deployed. Redeploy the Amplify backend.",
    );
  }

  const { data, errors } = await client.mutations.updateOrderFulfillment({
    orderId: input.orderId,
    fulfillmentStatus: input.fulfillmentStatus,
    ...(input.carrier ? { carrier: input.carrier } : {}),
    ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
    ...(input.trackingUrl !== undefined
      ? { trackingUrl: input.trackingUrl }
      : {}),
    ...(input.notifyCustomer != null
      ? { notifyCustomer: input.notifyCustomer }
      : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Fulfillment update failed.");
  }

  return data;
}
