import { defineFunction } from "@aws-amplify/backend";

export const adminDeclinePrintRequest = defineFunction({
  name: "admin-decline-print-request",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
