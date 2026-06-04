import { defineFunction } from "@aws-amplify/backend";

export const toggleProductFavorite = defineFunction({
  name: "toggle-product-favorite",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
