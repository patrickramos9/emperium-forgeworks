import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
import type { Schema } from "../../data/resource";
import { verifyGuestToken } from "../guest-shared/cookie.js";
import { sendNewMessageEmailAlert } from "../order-shared/notifyMessage.js";
import { resolveContactEmail } from "../order-shared/resolveContactEmail.js";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as DataClientEnv,
);
Amplify.configure(resourceConfig, libraryOptions);

const dataClient = generateClient<Schema>();

const MAX_BODY_LENGTH = 4000;
const MAX_SUBJECT_LENGTH = 120;

type AppSyncEvent = {
  fieldName?: string;
  info?: { fieldName?: string };
  arguments: {
    guestId?: string | null;
    guestToken?: string | null;
    conversationId?: string | null;
    subject?: string | null;
    body?: string | null;
    email?: string | null;
    orderId?: string | null;
    imagePaths?: (string | null)[] | null;
    previewBody?: string | null;
  };
};

function resolveFieldName(event: AppSyncEvent): string {
  return event.fieldName ?? event.info?.fieldName ?? "";
}

async function requireGuestId(event: AppSyncEvent): Promise<string> {
  const guestId = event.arguments.guestId?.trim() ?? "";
  const guestToken = event.arguments.guestToken?.trim() ?? "";
  if (!(await verifyGuestToken(guestId, guestToken))) {
    throw new Error("Invalid or missing guest session.");
  }
  return guestId;
}

function normalizeOptionalEmail(
  raw: string | null | undefined,
): string | undefined {
  const email = raw?.trim().toLowerCase() ?? "";
  if (!email) return undefined;
  if (!email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

function normalizeSubject(raw: string): string {
  const subject = raw.trim().replace(/\s+/g, " ");
  if (!subject) throw new Error("Enter a short subject.");
  if (subject.length > MAX_SUBJECT_LENGTH) {
    throw new Error(`Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`);
  }
  return subject;
}

function normalizeBody(
  raw: string,
  options?: { allowEmpty?: boolean },
): string {
  const body = raw.trim();
  if (!body) {
    if (options?.allowEmpty) return "";
    throw new Error("Enter a message.");
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw new Error(`Message must be ${MAX_BODY_LENGTH} characters or fewer.`);
  }
  return body;
}

function normalizeImagePaths(
  paths: (string | null)[] | null | undefined,
): string[] | undefined {
  if (!paths?.length) return undefined;
  const cleaned = paths
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  if (!cleaned.length) return undefined;
  if (cleaned.length > 4) {
    throw new Error("Attach up to 4 images per message.");
  }
  for (const path of cleaned) {
    if (!path.startsWith("message-attachments/")) {
      throw new Error("Invalid attachment path.");
    }
  }
  return cleaned;
}

function toConversationItem(row: Schema["Conversation"]["type"]) {
  return {
    id: row.id,
    guestId: row.guestId ?? undefined,
    subject: row.subject,
    orderId: row.orderId ?? undefined,
    customerEmail: row.customerEmail ?? undefined,
    lastMessageAt: row.lastMessageAt,
    unreadForCustomer: row.unreadForCustomer ?? false,
    unreadForAdmin: row.unreadForAdmin ?? false,
  };
}

function toMessageItem(row: Schema["Message"]["type"]) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderRole: row.senderRole ?? "customer",
    body: row.body,
    imagePaths: (row.imagePaths ?? []).filter(
      (p): p is string => typeof p === "string" && Boolean(p.trim()),
    ),
    createdAt: row.createdAt ?? undefined,
  };
}

async function handleGetGuestConversations(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const Conversation = dataClient.models.Conversation;
  if (!Conversation) {
    throw new Error("Messages are not available yet.");
  }

  const rows: ReturnType<typeof toConversationItem>[] = [];
  let nextToken: string | undefined;
  do {
    const response = await Conversation.list({
      filter: { guestId: { eq: guestId } },
      limit: 50,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row?.id) rows.push(toConversationItem(row));
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  rows.sort((a, b) =>
    (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
  );
  return { conversations: rows };
}

async function requireGuestConversation(
  guestId: string,
  conversationId: string,
) {
  const Conversation = dataClient.models.Conversation;
  if (!Conversation) {
    throw new Error("Messages are not available yet.");
  }
  const { data, errors } = await Conversation.get({ id: conversationId });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data || data.guestId !== guestId) {
    throw new Error("Conversation not found.");
  }
  return data;
}

async function handleGetGuestConversationMessages(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const conversationId = event.arguments.conversationId?.trim() ?? "";
  if (!conversationId) throw new Error("Conversation id is required.");
  await requireGuestConversation(guestId, conversationId);

  const Message = dataClient.models.Message;
  if (!Message) {
    throw new Error("Messages are not available yet.");
  }

  const rows: ReturnType<typeof toMessageItem>[] = [];
  let nextToken: string | undefined;
  do {
    const response = await Message.list({
      filter: { conversationId: { eq: conversationId } },
      limit: 100,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row?.id) rows.push(toMessageItem(row));
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  rows.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  return { messages: rows };
}

async function handleStartGuestConversation(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const email = normalizeOptionalEmail(event.arguments.email);

  const imagePaths = normalizeImagePaths(event.arguments.imagePaths);
  const subject = normalizeSubject(event.arguments.subject ?? "");
  const body = normalizeBody(event.arguments.body ?? "", {
    allowEmpty: Boolean(imagePaths?.length),
  });
  if (!body && !imagePaths?.length) {
    throw new Error("Enter a message or attach a photo.");
  }

  const orderId = event.arguments.orderId?.trim() || undefined;
  const now = new Date().toISOString();

  const Conversation = dataClient.models.Conversation;
  const Message = dataClient.models.Message;
  if (!Conversation || !Message) {
    throw new Error("Messages are not available yet.");
  }

  const { data: conversation, errors } = await Conversation.create({
    guestId,
    subject,
    lastMessageAt: now,
    unreadForCustomer: false,
    unreadForAdmin: true,
    ...(email ? { customerEmail: email } : {}),
    ...(orderId ? { orderId } : {}),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!conversation?.id) {
    throw new Error("Could not start conversation.");
  }

  const { errors: messageErrors } = await Message.create({
    conversationId: conversation.id,
    conversationUserId: guestId,
    senderRole: "customer",
    body: body || "(Photo attached)",
    ...(imagePaths ? { imagePaths } : {}),
  });
  if (messageErrors?.length) {
    throw new Error(messageErrors.map((e) => e.message).join("; "));
  }

  return { conversation: toConversationItem(conversation) };
}

async function handleReplyGuestConversation(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const conversationId = event.arguments.conversationId?.trim() ?? "";
  if (!conversationId) throw new Error("Conversation id is required.");

  await requireGuestConversation(guestId, conversationId);

  const imagePaths = normalizeImagePaths(event.arguments.imagePaths);
  const body = normalizeBody(event.arguments.body ?? "", {
    allowEmpty: Boolean(imagePaths?.length),
  });
  if (!body && !imagePaths?.length) {
    throw new Error("Enter a message or attach a photo.");
  }

  const Message = dataClient.models.Message;
  const Conversation = dataClient.models.Conversation;
  if (!Message || !Conversation) {
    throw new Error("Messages are not available yet.");
  }

  const now = new Date().toISOString();
  const { errors } = await Message.create({
    conversationId,
    conversationUserId: guestId,
    senderRole: "customer",
    body: body || "(Photo attached)",
    ...(imagePaths ? { imagePaths } : {}),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  const { errors: updateErrors } = await Conversation.update({
    id: conversationId,
    lastMessageAt: now,
    unreadForCustomer: false,
    unreadForAdmin: true,
  });
  if (updateErrors?.length) {
    throw new Error(updateErrors.map((e) => e.message).join("; "));
  }

  return { success: true };
}

async function handleUpdateGuestConversationEmail(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const conversationId = event.arguments.conversationId?.trim() ?? "";
  if (!conversationId) throw new Error("Conversation id is required.");

  const email = normalizeOptionalEmail(event.arguments.email);
  if (!email) {
    throw new Error("Enter a valid email address.");
  }

  await requireGuestConversation(guestId, conversationId);

  const Conversation = dataClient.models.Conversation;
  if (!Conversation) {
    throw new Error("Messages are not available yet.");
  }

  const { data, errors } = await Conversation.update({
    id: conversationId,
    customerEmail: email,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return {
    success: true,
    customerEmail: data?.customerEmail ?? email,
  };
}

/**
 * Email the thread's customerEmail when the shop replies.
 * Works for guests and signed-in accounts (as long as customerEmail is set).
 */
async function handleNotifyGuestMessageEmail(event: AppSyncEvent) {
  const conversationId = event.arguments.conversationId?.trim() ?? "";
  if (!conversationId) throw new Error("Conversation id is required.");

  const Conversation = dataClient.models.Conversation;
  if (!Conversation) {
    throw new Error("Messages are not available yet.");
  }

  const { data, errors } = await Conversation.get({ id: conversationId });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Conversation not found.");
  }

  const to = await resolveContactEmail({
    email: data.customerEmail,
    userId: data.userId,
  });
  if (!to) {
    console.warn(
      `Message email skipped — conversation ${conversationId} has no customerEmail (and Cognito lookup failed or no userId).`,
    );
    return { sent: false };
  }

  // Backfill so later replies and admin UI stay consistent.
  if (!data.customerEmail?.trim()) {
    try {
      await Conversation.update({
        id: conversationId,
        customerEmail: to,
      });
    } catch (err) {
      console.warn("Could not backfill conversation customerEmail", err);
    }
  }

  const preview =
    event.arguments.previewBody?.trim() ||
    "The shop replied to your conversation.";

  try {
    const sent = await sendNewMessageEmailAlert({
      to,
      subject: data.subject,
      conversationId: data.id,
      previewBody: preview,
    });
    if (!sent) {
      console.warn(
        `Message email not sent to ${to} (check RESEND_API_KEY / Settings toggle).`,
      );
    }
    return { sent };
  } catch (err) {
    console.error("Message email failed", err);
    return { sent: false };
  }
}

async function handleMarkGuestConversationRead(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const conversationId = event.arguments.conversationId?.trim() ?? "";
  if (!conversationId) throw new Error("Conversation id is required.");

  const row = await requireGuestConversation(guestId, conversationId);
  if (!row.unreadForCustomer) {
    return { success: true };
  }

  const Conversation = dataClient.models.Conversation;
  if (!Conversation) {
    throw new Error("Messages are not available yet.");
  }

  const { errors } = await Conversation.update({
    id: conversationId,
    unreadForCustomer: false,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return { success: true };
}

async function deleteMessagesForConversation(conversationId: string) {
  const Message = dataClient.models.Message;
  if (!Message) {
    throw new Error("Messages are not available yet.");
  }

  const messageIds: string[] = [];
  let nextToken: string | undefined;
  do {
    const response = await Message.list({
      filter: { conversationId: { eq: conversationId } },
      limit: 100,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row?.id) messageIds.push(row.id);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  for (const id of messageIds) {
    const { errors } = await Message.delete({ id });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
  }
}

async function handleDeleteGuestConversation(event: AppSyncEvent) {
  const guestId = await requireGuestId(event);
  const conversationId = event.arguments.conversationId?.trim() ?? "";
  if (!conversationId) throw new Error("Conversation id is required.");

  await requireGuestConversation(guestId, conversationId);
  await deleteMessagesForConversation(conversationId);

  const Conversation = dataClient.models.Conversation;
  if (!Conversation) {
    throw new Error("Messages are not available yet.");
  }

  const { errors } = await Conversation.delete({ id: conversationId });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return { success: true };
}

export const handler = async (event: AppSyncEvent) => {
  const fieldName = resolveFieldName(event);
  switch (fieldName) {
    case "getGuestConversationMessages":
      return handleGetGuestConversationMessages(event);
    case "startGuestConversation":
      return handleStartGuestConversation(event);
    case "replyGuestConversation":
      return handleReplyGuestConversation(event);
    case "updateGuestConversationEmail":
      return handleUpdateGuestConversationEmail(event);
    case "notifyGuestMessageEmail":
      return handleNotifyGuestMessageEmail(event);
    case "markGuestConversationRead":
      return handleMarkGuestConversationRead(event);
    case "deleteGuestConversation":
      return handleDeleteGuestConversation(event);
    case "getGuestConversations":
    default:
      return handleGetGuestConversations(event);
  }
};
