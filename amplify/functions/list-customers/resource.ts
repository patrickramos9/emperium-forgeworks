import { defineFunction } from "@aws-amplify/backend";

export const listCustomers = defineFunction({
  name: "list-customers",
  entry: "./handler.ts",
  environment: {
    GROUP_NAME: "customer",
  },
  resourceGroupName: "auth",
});
