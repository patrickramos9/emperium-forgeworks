import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import Stripe from "stripe";
import type { Schema } from "../../data/resource";
import { issueOrderRefund } from "../order-shared/issueOrderRefund.js";
import {
  applyPrintLineReview,
  computePrintRejectRefundCents,
  createPrintReviewNotification,
  findPrintLineByUploadId,
  parseOrderLineItems,
} from "../order-shared/printLineReview.js";
import type { PrintReviewStatus } from "../order-shared/printService.js";
import { getOrderById } from "../order-shared/stripeOrderStatus.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

const VALID_STATUSES = new Set<PrintReviewStatus>(["approved", "rejected"]);

export const handler: Schema["updatePrintLineReview"]["functionHandler"] =
  async (event) => {
    const orderId = event.arguments.orderId;
    const uploadId = event.arguments.uploadId.trim();
    const reviewStatus = event.arguments.reviewStatus as PrintReviewStatus;
    const reviewNotes = event.arguments.reviewNotes?.trim() || undefined;

    if (!uploadId) {
      throw new Error("uploadId is required.");
    }
    if (!VALID_STATUSES.has(reviewStatus)) {
      throw new Error("Invalid review status.");
    }

    const order = await getOrderById(dataClient, orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.status !== "paid" && order.status !== "refunded") {
      throw new Error("Print review is only available for paid orders.");
    }

    const lines = parseOrderLineItems(order.lineItems);
    const match = findPrintLineByUploadId(lines, uploadId);
    if (!match) {
      throw new Error("Print line not found on this order.");
    }

    let refundedCents = 0;
    let orderStatus: string = order.status ?? "paid";

    if (reviewStatus === "rejected") {
      const amountCents = computePrintRejectRefundCents(order, lines, uploadId);
      const secretKey = process.env.STRIPE_SECRET_KEY;
      const stripe =
        order.paymentProvider === "stripe" && secretKey
          ? new Stripe(secretKey)
          : undefined;

      if (order.paymentProvider === "stripe" && !stripe) {
        throw new Error("Stripe is not configured.");
      }

      const refundResult = await issueOrderRefund(dataClient, order, {
        amountCents,
        reason: "requested_by_customer",
        refundNotes: `Print file rejected (${match.payload.originalFileName || "uploaded file"}).`,
        source: "print_reject",
        stripe,
      });
      refundedCents = refundResult.refundedCents;
      orderStatus = refundResult.orderStatus;
    }

    const nextLines = applyPrintLineReview(lines, uploadId, reviewStatus, reviewNotes);
    const updateResult = await dataClient.models.Order.update({
      id: order.id,
      lineItems: JSON.stringify(nextLines),
    });
    if (updateResult.errors?.length) {
      throw new Error(updateResult.errors.map((e) => e.message).join("; "));
    }

    let notificationSent = false;
    try {
      notificationSent = await createPrintReviewNotification(
        dataClient,
        order,
        reviewStatus,
        match.payload.originalFileName || "uploaded file",
        reviewNotes,
      );
    } catch (err) {
      console.error("Print review notification failed", err);
    }

    return {
      success: true,
      reviewStatus,
      notificationSent,
      refundedCents,
      orderStatus,
    };
  };
