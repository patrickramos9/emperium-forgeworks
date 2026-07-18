import { defineFunction } from "@aws-amplify/backend";

export const createPrintQuoteCheckout = defineFunction({
  name: "create-print-quote-checkout",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  resourceGroupName: "data",
});
