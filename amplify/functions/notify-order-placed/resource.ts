import { defineFunction } from "@aws-amplify/backend";

export const notifyOrderPlaced = defineFunction({
  name: "notify-order-placed",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
