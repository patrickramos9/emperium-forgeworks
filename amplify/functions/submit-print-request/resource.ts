import { defineFunction } from "@aws-amplify/backend";

export const submitPrintRequest = defineFunction({
  name: "submit-print-request",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
