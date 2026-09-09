import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import { sendPromoGrantEmailAlert } from "../order-shared/notifyPromo.js";
import { issueNewAccountGrantIfNeeded } from "../promo-shared/grantIssuance.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

type AppSyncEvent = {
  fieldName?: string;
  info?: { fieldName?: string };
  identity?: { sub?: string } | null;
  arguments: {
    userId?: string | null;
    title?: string | null;
    body?: string | null;
  };
};

function resolveFieldName(event: AppSyncEvent): string {
  return event.fieldName ?? event.info?.fieldName ?? "issueNewAccountWelcomeGrant";
}

async function handleIssueWelcome(event: AppSyncEvent) {
  const userId =
    event.identity && "sub" in event.identity
      ? (event.identity.sub as string | undefined)
      : undefined;
  if (!userId) {
    throw new Error("Sign in to claim your welcome offer.");
  }

  const issued = await issueNewAccountGrantIfNeeded(dataClient, userId);
  return { issued };
}

async function handleNotifyPromoGrantEmail(event: AppSyncEvent) {
  const userId = event.arguments.userId?.trim() ?? "";
  const title = event.arguments.title?.trim() ?? "";
  const body = event.arguments.body?.trim() ?? "";
  if (!userId) throw new Error("userId is required.");
  if (!title || !body) throw new Error("title and body are required.");

  try {
    const sent = await sendPromoGrantEmailAlert({ userId, title, body });
    return { sent };
  } catch (err) {
    console.error("notifyPromoGrantEmail failed", err);
    return { sent: false };
  }
}

export const handler = async (event: AppSyncEvent) => {
  const fieldName = resolveFieldName(event);
  switch (fieldName) {
    case "notifyPromoGrantEmail":
      return handleNotifyPromoGrantEmail(event);
    case "issueNewAccountWelcomeGrant":
    default:
      return handleIssueWelcome(event);
  }
};
