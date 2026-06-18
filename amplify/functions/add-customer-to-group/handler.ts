import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import type { Schema } from "../../data/resource";
import { issueNewAccountGrantIfNeeded } from "../promo-shared/grantIssuance.js";

const cognito = new CognitoIdentityProviderClient();
const GROUP_NAME = process.env.GROUP_NAME ?? "customer";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

export const handler: PostConfirmationTriggerHandler = async (event) => {
  await cognito.send(
    new AdminAddUserToGroupCommand({
      GroupName: GROUP_NAME,
      Username: event.userName,
      UserPoolId: event.userPoolId,
    }),
  );

  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
    return event;
  }

  const userId =
    event.request.userAttributes.sub?.trim() || event.userName?.trim();
  if (!userId) {
    console.error("postConfirmation missing user sub");
    return event;
  }

  try {
    await issueNewAccountGrantIfNeeded(dataClient, userId);
  } catch (err) {
    console.error("New account promo grant failed", err);
  }

  return event;
};
