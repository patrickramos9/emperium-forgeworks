import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient();
const GROUP_NAME = process.env.GROUP_NAME ?? "customer";

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const command = new AdminAddUserToGroupCommand({
    GroupName: GROUP_NAME,
    Username: event.userName,
    UserPoolId: event.userPoolId,
  });

  await client.send(command);
  return event;
};
