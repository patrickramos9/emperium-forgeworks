import { defineFunction } from "@aws-amplify/backend";

export const stripeWebhook = defineFunction({
  name: "stripe-webhook",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
