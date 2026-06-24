import { defineFunction } from "@aws-amplify/backend";

export const submitReturnRequest = defineFunction({
  name: "submit-return-request",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
