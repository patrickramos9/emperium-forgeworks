import { defineFunction } from "@aws-amplify/backend";

export const adminQuotePrintRequest = defineFunction({
  name: "admin-quote-print-request",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
