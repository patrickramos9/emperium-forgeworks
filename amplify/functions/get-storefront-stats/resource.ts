import { defineFunction } from "@aws-amplify/backend";

export const getStorefrontStats = defineFunction({
  name: "get-storefront-stats",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
