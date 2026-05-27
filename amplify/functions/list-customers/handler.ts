import {
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../../data/resource";

const client = new CognitoIdentityProviderClient();
const GROUP_NAME = process.env.GROUP_NAME ?? "customer";
const MAX_PAGE = 60;

function mapUser(user: {
  Username?: string;
  Attributes?: { Name?: string; Value?: string }[];
}) {
  const email =
    user.Attributes?.find((attr) => attr.Name === "email")?.Value ?? "";
  const userId =
    user.Attributes?.find((attr) => attr.Name === "sub")?.Value ??
    user.Username ??
    "";
  return { userId, email };
}

export const handler: Schema["listCustomers"]["functionHandler"] = async (
  event,
) => {
  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    throw new Error("USER_POOL_ID is not configured on list-customers");
  }

  const emailFilter = event.arguments.emailFilter?.trim().toLowerCase() ?? "";
  const limit = Math.min(Math.max(event.arguments.limit ?? 25, 1), MAX_PAGE);
  let nextToken = event.arguments.nextToken ?? undefined;

  const items: { userId: string; email: string }[] = [];
  let responseNextToken: string | undefined;

  while (items.length < limit) {
    const result = await client.send(
      new ListUsersInGroupCommand({
        UserPoolId: userPoolId,
        GroupName: GROUP_NAME,
        Limit: MAX_PAGE,
        NextToken: nextToken,
      }),
    );

    for (const user of result.Users ?? []) {
      const mapped = mapUser(user);
      if (!mapped.userId || !mapped.email) continue;
      if (emailFilter && !mapped.email.toLowerCase().includes(emailFilter)) {
        continue;
      }
      items.push(mapped);
      if (items.length >= limit) break;
    }

    responseNextToken = result.NextToken;
    if (!responseNextToken || items.length >= limit) break;
    nextToken = responseNextToken;
  }

  return {
    items,
    nextToken:
      items.length >= limit ? responseNextToken : responseNextToken ?? undefined,
  };
};
