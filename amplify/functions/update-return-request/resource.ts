import { defineFunction } from "@aws-amplify/backend";

export const updateReturnRequest = defineFunction({
  name: "update-return-request",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
