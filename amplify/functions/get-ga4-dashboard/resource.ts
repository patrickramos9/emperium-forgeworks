import { defineFunction } from "@aws-amplify/backend";

export const getGa4Dashboard = defineFunction({
  name: "get-ga4-dashboard",
  entry: "./handler.ts",
  resourceGroupName: "data",
});
