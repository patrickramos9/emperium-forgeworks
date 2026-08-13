import { defineFunction } from "@aws-amplify/backend";

export const guestMessages = defineFunction({
  name: "guest-messages",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
