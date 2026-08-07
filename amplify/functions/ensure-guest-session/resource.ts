import { defineFunction } from "@aws-amplify/backend";

export const ensureGuestSession = defineFunction({
  name: "ensure-guest-session",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  resourceGroupName: "data",
});
