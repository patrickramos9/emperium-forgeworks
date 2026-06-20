import { defineFunction } from "@aws-amplify/backend";

export const issueNewAccountGrant = defineFunction({
  name: "issue-new-account-grant",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  resourceGroupName: "data",
});
