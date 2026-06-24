import { defineFunction } from "@aws-amplify/backend";

export const createStripeRefund = defineFunction({
  name: "create-stripe-refund",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
