import { defineFunction } from "@aws-amplify/backend";

export const updateOrderFulfillment = defineFunction({
  name: "update-order-fulfillment",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
