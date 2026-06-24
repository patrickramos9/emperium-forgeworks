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

const STATUSES = new Set([
  "requested",
  "approved",
  "denied",
  "received",
  "closed",
]);

export const handler: Schema["adminUpdateReturnRequest"]["functionHandler"] =
  async (event) => {
    const returnRequestId = event.arguments.returnRequestId;
    const status = event.arguments.status;
    const adminNotes = event.arguments.adminNotes?.trim();

    const existing = await dataClient.models.ReturnRequest.get({
      id: returnRequestId,
    });
    if (existing.errors?.length) {
      throw new Error(existing.errors.map((e) => e.message).join("; "));
    }
    if (!existing.data) {
      throw new Error("Return request not found.");
    }

    const row = existing.data;
    const nextStatus = status ?? row.status;
    if (!nextStatus || !STATUSES.has(nextStatus)) {
      throw new Error("Invalid return status.");
    }

    const resolvedAt =
      nextStatus === "denied" || nextStatus === "closed"
        ? row.resolvedAt ?? new Date().toISOString()
        : row.resolvedAt;

    const { data, errors } = await dataClient.models.ReturnRequest.update({
      id: returnRequestId,
      status: nextStatus,
      ...(adminNotes !== undefined ? { adminNotes } : {}),
      ...(resolvedAt ? { resolvedAt } : {}),
    });

    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
    if (!data) {
      throw new Error("Return request update failed.");
    }

    return {
      success: true,
      status: data.status ?? nextStatus,
    };
  };
