import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { PostConfirmationTriggerHandler } from "aws-lambda";

const cognito = new CognitoIdentityProviderClient();
const GROUP_NAME = process.env.GROUP_NAME ?? "customer";

export const handler: PostConfirmationTriggerHandler = async (event) => {
  await cognito.send(
    new AdminAddUserToGroupCommand({
      GroupName: GROUP_NAME,
      Username: event.userName,
      UserPoolId: event.userPoolId,
    }),
  );

  return event;
};
