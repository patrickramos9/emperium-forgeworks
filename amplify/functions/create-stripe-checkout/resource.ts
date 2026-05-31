import { defineFunction } from "@aws-amplify/backend";

export const createStripeCheckout = defineFunction({
  name: "create-stripe-checkout",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
