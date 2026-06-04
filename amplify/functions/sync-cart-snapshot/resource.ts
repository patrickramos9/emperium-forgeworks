import { defineFunction } from "@aws-amplify/backend";

export const syncCartSnapshot = defineFunction({
  name: "sync-cart-snapshot",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
