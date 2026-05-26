import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../data/resource";

const client = new CognitoIdentityProviderClient();

export const handler: Schema["lookupCustomerByEmail"]["functionHandler"] = async (
  event,
) => {
  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    throw new Error("USER_POOL_ID is not configured on lookup-customer-by-email");
  }

  const email = event.arguments.email.trim().toLowerCase();
  if (!email) {
    throw new Error("Email is required.");
  }

  const result = await client.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 1,
    }),
  );

  const user = result.Users?.[0];
  if (!user) {
    throw new Error("No customer account found for that email.");
  }

  const sub =
    user.Attributes?.find((attr) => attr.Name === "sub")?.Value ?? user.Username;
  const userEmail =
    user.Attributes?.find((attr) => attr.Name === "email")?.Value ?? email;

  return { userId: sub ?? "", email: userEmail };
};
