import { defineFunction } from "@aws-amplify/backend";

export const lookupCustomerByEmail = defineFunction({
  name: "lookup-customer-by-email",
  entry: "./handler.ts",
  resourceGroupName: "auth",
});
