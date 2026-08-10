import { defineFunction } from "@aws-amplify/backend";

export const cleanupIdleCarts = defineFunction({
  name: "cleanup-idle-carts",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  memoryMB: 512,
  resourceGroupName: "data",
  /** Daily job reads CatalogSettings; no-ops when cartCleanupEnabled is false. */
  schedule: "every day",
});
