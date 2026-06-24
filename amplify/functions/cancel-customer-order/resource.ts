import { defineFunction } from "@aws-amplify/backend";

export const cancelCustomerOrder = defineFunction({
  name: "cancel-customer-order",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
