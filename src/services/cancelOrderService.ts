import type { AmplifyDataClient } from "@/lib/amplifyDataClient";

export type CancelCustomerOrderResult = {
  success: boolean;
  refundId?: string | null;
  refundedCents: number;
  orderStatus: string;
};

export async function cancelCustomerOrder(
  client: AmplifyDataClient,
  orderId: string,
): Promise<CancelCustomerOrderResult> {
  if (!client.mutations.cancelCustomerOrder) {
    throw new Error(
      "Order cancellation is not deployed. Redeploy the Amplify backend.",
    );
  }

  const { data, errors } = await client.mutations.cancelCustomerOrder({
    orderId,
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Cancellation failed.");
  }

  return data;
}
