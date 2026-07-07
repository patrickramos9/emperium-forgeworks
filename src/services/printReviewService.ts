import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { PrintReviewStatus } from "@/lib/printService";

export type UpdatePrintLineReviewInput = {
  orderId: string;
  uploadId: string;
  reviewStatus: PrintReviewStatus;
  reviewNotes?: string;
};

export type UpdatePrintLineReviewResult = {
  success: boolean;
  reviewStatus: string;
  notificationSent: boolean;
  refundedCents: number;
  orderStatus: string;
};

export async function updatePrintLineReview(
  client: AmplifyDataClient,
  input: UpdatePrintLineReviewInput,
): Promise<UpdatePrintLineReviewResult> {
  if (!client.mutations.updatePrintLineReview) {
    throw new Error(
      "Print file review is not deployed. Redeploy the Amplify backend.",
    );
  }

  if (input.reviewStatus !== "approved" && input.reviewStatus !== "rejected") {
    throw new Error("Invalid review status.");
  }

  const { data, errors } = await client.mutations.updatePrintLineReview({
    orderId: input.orderId,
    uploadId: input.uploadId,
    reviewStatus: input.reviewStatus,
    ...(input.reviewNotes?.trim()
      ? { reviewNotes: input.reviewNotes.trim() }
      : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Print review update failed.");
  }

  return data;
}
