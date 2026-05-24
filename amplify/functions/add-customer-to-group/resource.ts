import { defineFunction } from "@aws-amplify/backend";

export const addCustomerToGroup = defineFunction({
  name: "addCustomerToGroup",
  entry: "./handler.ts",
  environment: {
    GROUP_NAME: "customer",
  },
  resourceGroupName: "auth",
});
