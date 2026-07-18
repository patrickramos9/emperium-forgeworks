import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: Schema["adminDeclinePrintRequest"]["functionHandler"] =
  async (event) => {
    const printRequestId = event.arguments.printRequestId;
    const adminNotes = event.arguments.adminNotes?.trim() || undefined;

    const { data: request, errors } = await dataClient.models.PrintRequest.get({
      id: printRequestId,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    if (!request) {
      throw new Error("Print request not found.");
    }
    if (
      request.status === "paid" ||
      request.status === "declined" ||
      request.status === "cancelled"
    ) {
      throw new Error(
        `Cannot decline a request in status "${request.status ?? "unknown"}".`,
      );
    }

    const updateResult = await dataClient.models.PrintRequest.update({
      id: printRequestId,
      status: "declined",
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    });
    if (updateResult.errors?.length) {
      throw new Error(updateResult.errors.map((e) => e.message).join("; "));
    }

    let notificationSent = false;
    const userId = request.userId?.trim();
    if (userId) {
      try {
        const siteUrl = (
          process.env.SITE_URL ?? "https://emperiumforgeworks.com"
        ).replace(/\/$/, "");
        const notePart = adminNotes
          ? ` Note: ${adminNotes}`
          : "";
        const result = await dataClient.models.Notification.create({
          title: "Print request declined",
          body: `Your print request (${request.originalFileName}) could not be accepted.${notePart} Details: ${siteUrl}/account/print-requests/${printRequestId}`,
          kind: "order",
          userId,
          active: true,
          sortOrder: 86,
        });
        notificationSent = !result.errors?.length;
      } catch (err) {
        console.error("Decline notification failed", err);
      }
    }

    return {
      success: true,
      notificationSent,
    };
  };
