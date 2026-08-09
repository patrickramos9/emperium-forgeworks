import { defineFunction } from "@aws-amplify/backend";

export const guestNotifications = defineFunction({
  name: "guest-notifications",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
