import { defineFunction } from "@aws-amplify/backend";

export const updatePrintLineReview = defineFunction({
  name: "update-print-line-review",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
