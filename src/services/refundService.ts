import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { StripeRefundReason } from "@/lib/orderRefunds";

export type CreateStripeRefundInput = {
  orderId: string;
  amountCents?: number;
  reason?: StripeRefundReason;
  refundNotes?: string;
};

export type CreateStripeRefundResult = {
  success: boolean;
  refundId?: string | null;
  refundedCents: number;
  orderStatus: string;
};

export async function createStripeRefund(
  client: AmplifyDataClient,
  input: CreateStripeRefundInput,
): Promise<CreateStripeRefundResult> {
  if (!client.mutations.createStripeRefund) {
    throw new Error(
      "Stripe refunds are not deployed. Redeploy the Amplify backend.",
    );
  }

  const { data, errors } = await client.mutations.createStripeRefund({
    orderId: input.orderId,
    ...(input.amountCents != null ? { amountCents: input.amountCents } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.refundNotes ? { refundNotes: input.refundNotes } : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Refund failed.");
  }

  return data;
}
