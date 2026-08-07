import { defineFunction } from "@aws-amplify/backend";

export const mergeGuestIdentity = defineFunction({
  name: "merge-guest-identity",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
