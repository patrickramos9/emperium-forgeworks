import { defineFunction } from "@aws-amplify/backend";

export const cancelStripeCheckout = defineFunction({
  name: "cancel-stripe-checkout",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
