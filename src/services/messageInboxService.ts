import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import {
  requireConversationModel,
  requireMessageModel,
} from "@/lib/dataModels";
import { getCustomerEmail, getCustomerUserId } from "@/lib/customerAuth";

export type ConversationRecord = Schema["Conversation"]["type"];
export type MessageRecord = Schema["Message"]["type"];
export type MessageSenderRole = NonNullable<MessageRecord["senderRole"]>;

const MAX_BODY_LENGTH = 4000;
const MAX_SUBJECT_LENGTH = 120;

function sortByLastMessage(
  rows: ConversationRecord[],
): ConversationRecord[] {
  return [...rows].sort((a, b) => {
    const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTime - aTime;
  });
}

function sortMessagesOldestFirst(rows: MessageRecord[]): MessageRecord[] {
  return [...rows].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return aTime - bTime;
  });
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

function normalizeImagePaths(paths: string[] | undefined): string[] | undefined {
  if (!paths?.length) return undefined;
  const cleaned = paths.map((p) => p.trim()).filter(Boolean);
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

async function listAllConversations(
  client: AmplifyDataClient,
): Promise<ConversationRecord[]> {
  const Conversation = requireConversationModel(client);
  const rows: ConversationRecord[] = [];
  let nextToken: string | undefined;
  do {
    const response = await Conversation.list({ limit: 50, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);
  return sortByLastMessage(rows);
}

export async function listCustomerConversations(
  client: AmplifyDataClient,
): Promise<ConversationRecord[]> {
  return listAllConversations(client);
}

export async function listAdminConversations(
  client: AmplifyDataClient,
): Promise<ConversationRecord[]> {
  return listAllConversations(client);
}

export async function getConversationById(
  client: AmplifyDataClient,
  id: string,
): Promise<ConversationRecord | null> {
  const Conversation = requireConversationModel(client);
  const { data, errors } = await Conversation.get({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data ?? null;
}

export async function listMessagesForConversation(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<MessageRecord[]> {
  const Message = requireMessageModel(client);
  const rows: MessageRecord[] = [];
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
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);
  return sortMessagesOldestFirst(rows);
}

export async function countUnreadForCustomer(
  client: AmplifyDataClient,
): Promise<number> {
  const rows = await listCustomerConversations(client);
  return rows.filter((row) => row.unreadForCustomer).length;
}

export async function countUnreadForAdmin(
  client: AmplifyDataClient,
): Promise<number> {
  const rows = await listAdminConversations(client);
  return rows.filter((row) => row.unreadForAdmin).length;
}

export async function startCustomerConversation(
  client: AmplifyDataClient,
  input: {
    subject: string;
    body: string;
    orderId?: string;
    imagePaths?: string[];
  },
): Promise<ConversationRecord> {
  const userId = await getCustomerUserId();
  if (!userId) throw new Error("Sign in to send a message.");

  const imagePaths = normalizeImagePaths(input.imagePaths);
  const subject = normalizeSubject(input.subject);
  const body = normalizeBody(input.body, {
    allowEmpty: Boolean(imagePaths?.length),
  });
  if (!body && !imagePaths?.length) {
    throw new Error("Enter a message or attach a photo.");
  }
  const now = new Date().toISOString();
  const email = await getCustomerEmail();

  const Conversation = requireConversationModel(client);
  const Message = requireMessageModel(client);

  const { data: conversation, errors } = await Conversation.create({
    userId,
    subject,
    lastMessageAt: now,
    unreadForCustomer: false,
    unreadForAdmin: true,
    ...(input.orderId ? { orderId: input.orderId } : {}),
    ...(email ? { customerEmail: email } : {}),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!conversation?.id) {
    throw new Error("Could not start conversation.");
  }

  const { errors: messageErrors } = await Message.create({
    conversationId: conversation.id,
    conversationUserId: userId,
    senderRole: "customer",
    body: body || "(Photo attached)",
    ...(imagePaths ? { imagePaths } : {}),
  });
  if (messageErrors?.length) {
    throw new Error(messageErrors.map((e) => e.message).join("; "));
  }

  return conversation;
}

export async function replyAsCustomer(
  client: AmplifyDataClient,
  conversationId: string,
  bodyRaw: string,
  imagePathsRaw?: string[],
): Promise<void> {
  const userId = await getCustomerUserId();
  if (!userId) throw new Error("Sign in to reply.");

  const conversation = await getConversationById(client, conversationId);
  if (!conversation || conversation.userId !== userId) {
    throw new Error("Conversation not found.");
  }

  const imagePaths = normalizeImagePaths(imagePathsRaw);
  const body = normalizeBody(bodyRaw, {
    allowEmpty: Boolean(imagePaths?.length),
  });
  if (!body && !imagePaths?.length) {
    throw new Error("Enter a message or attach a photo.");
  }
  const now = new Date().toISOString();
  const Message = requireMessageModel(client);
  const Conversation = requireConversationModel(client);

  const { errors } = await Message.create({
    conversationId,
    conversationUserId: userId,
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
}

export async function replyAsAdmin(
  client: AmplifyDataClient,
  conversationId: string,
  bodyRaw: string,
  imagePathsRaw?: string[],
): Promise<void> {
  const conversation = await getConversationById(client, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  const imagePaths = normalizeImagePaths(imagePathsRaw);
  const body = normalizeBody(bodyRaw, {
    allowEmpty: Boolean(imagePaths?.length),
  });
  if (!body && !imagePaths?.length) {
    throw new Error("Enter a message or attach a photo.");
  }
  const now = new Date().toISOString();
  const Message = requireMessageModel(client);
  const Conversation = requireConversationModel(client);

  const ownerKey = conversation.userId ?? conversation.guestId;
  if (!ownerKey) {
    throw new Error("Conversation has no owner.");
  }

  const { errors } = await Message.create({
    conversationId,
    conversationUserId: ownerKey,
    senderRole: "admin",
    body: body || "(Photo attached)",
    ...(imagePaths ? { imagePaths } : {}),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  const { errors: updateErrors } = await Conversation.update({
    id: conversationId,
    lastMessageAt: now,
    unreadForCustomer: true,
    unreadForAdmin: false,
  });
  if (updateErrors?.length) {
    throw new Error(updateErrors.map((e) => e.message).join("; "));
  }

  // Guest threads with a contact email get a Resend alert (best-effort).
  if (
    conversation.guestId &&
    conversation.customerEmail?.trim() &&
    client.mutations.notifyGuestMessageEmail
  ) {
    try {
      await client.mutations.notifyGuestMessageEmail({
        conversationId,
        previewBody: body || "(Photo attached)",
      });
    } catch (err) {
      console.warn("Guest message email notify failed", err);
    }
  }
}

export async function markConversationReadByCustomer(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<void> {
  const userId = await getCustomerUserId();
  const conversation = await getConversationById(client, conversationId);
  if (!conversation || conversation.userId !== userId) return;
  if (!conversation.unreadForCustomer) return;

  const Conversation = requireConversationModel(client);
  const { errors } = await Conversation.update({
    id: conversationId,
    unreadForCustomer: false,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export async function markConversationReadByAdmin(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<void> {
  const conversation = await getConversationById(client, conversationId);
  if (!conversation || !conversation.unreadForAdmin) return;

  const Conversation = requireConversationModel(client);
  const { errors } = await Conversation.update({
    id: conversationId,
    unreadForAdmin: false,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

async function deleteMessagesForConversation(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<void> {
  const Message = requireMessageModel(client);
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

/** Delete a signed-in customer's conversation and all messages in it. */
export async function deleteConversationAsCustomer(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<void> {
  const userId = await getCustomerUserId();
  if (!userId) throw new Error("Sign in to delete a conversation.");

  const conversation = await getConversationById(client, conversationId);
  if (!conversation || conversation.userId !== userId) {
    throw new Error("Conversation not found.");
  }

  await deleteMessagesForConversation(client, conversationId);
  const Conversation = requireConversationModel(client);
  const { errors } = await Conversation.delete({ id: conversationId });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

/** Delete any conversation as admin (including guest threads). */
export async function deleteConversationAsAdmin(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<void> {
  const conversation = await getConversationById(client, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  await deleteMessagesForConversation(client, conversationId);
  const Conversation = requireConversationModel(client);
  const { errors } = await Conversation.delete({ id: conversationId });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export function formatMessageTime(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function requireGuestSessionArgs(): Promise<{
  guestId: string;
  guestToken: string;
}> {
  const { ensureGuestSession, getStoredGuestSession } = await import(
    "@/services/guestSessionService"
  );
  await ensureGuestSession();
  const session = getStoredGuestSession();
  if (!session) {
    throw new Error("Could not start a guest session. Reload and try again.");
  }
  return session;
}

function mapGuestConversation(row: {
  id: string;
  guestId?: string | null;
  subject: string;
  orderId?: string | null;
  customerEmail?: string | null;
  lastMessageAt: string;
  unreadForCustomer?: boolean | null;
  unreadForAdmin?: boolean | null;
}): ConversationRecord {
  return {
    id: row.id,
    userId: null,
    guestId: row.guestId ?? null,
    subject: row.subject,
    orderId: row.orderId ?? null,
    customerEmail: row.customerEmail ?? null,
    lastMessageAt: row.lastMessageAt,
    unreadForCustomer: row.unreadForCustomer ?? false,
    unreadForAdmin: row.unreadForAdmin ?? false,
  } as ConversationRecord;
}

function mapGuestMessage(row: {
  id: string;
  conversationId: string;
  senderRole: string;
  body: string;
  imagePaths?: (string | null)[] | null;
  createdAt?: string | null;
}): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    conversationUserId: "",
    senderRole: row.senderRole === "admin" ? "admin" : "customer",
    body: row.body,
    imagePaths: (row.imagePaths ?? []).filter(
      (p): p is string => typeof p === "string" && Boolean(p.trim()),
    ),
    createdAt: row.createdAt ?? undefined,
  } as MessageRecord;
}

export async function listGuestConversations(
  client: AmplifyDataClient,
): Promise<ConversationRecord[]> {
  if (!client.queries.getGuestConversations) {
    throw new Error(
      "Guest messages are not available yet. Redeploy the Amplify backend.",
    );
  }
  const session = await requireGuestSessionArgs();
  const { data, errors } = await client.queries.getGuestConversations({
    guestId: session.guestId,
    guestToken: session.guestToken,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return (data?.conversations ?? [])
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.id))
    .map(mapGuestConversation);
}

export async function listGuestMessagesForConversation(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<MessageRecord[]> {
  if (!client.queries.getGuestConversationMessages) {
    throw new Error(
      "Guest messages are not available yet. Redeploy the Amplify backend.",
    );
  }
  const session = await requireGuestSessionArgs();
  const { data, errors } = await client.queries.getGuestConversationMessages({
    guestId: session.guestId,
    guestToken: session.guestToken,
    conversationId,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return (data?.messages ?? [])
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.id))
    .map(mapGuestMessage);
}

export async function startGuestConversation(
  client: AmplifyDataClient,
  input: {
    subject: string;
    body: string;
    email?: string;
    orderId?: string;
    imagePaths?: string[];
  },
): Promise<ConversationRecord> {
  if (!client.mutations.startGuestConversation) {
    throw new Error(
      "Guest messages are not available yet. Redeploy the Amplify backend.",
    );
  }
  const session = await requireGuestSessionArgs();
  const email = input.email?.trim() || undefined;
  const { data, errors } = await client.mutations.startGuestConversation({
    guestId: session.guestId,
    guestToken: session.guestToken,
    subject: input.subject,
    body: input.body,
    ...(email ? { email } : {}),
    ...(input.orderId ? { orderId: input.orderId } : {}),
    ...(input.imagePaths?.length ? { imagePaths: input.imagePaths } : {}),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data?.conversation?.id) {
    throw new Error("Could not start conversation.");
  }
  return mapGuestConversation(data.conversation);
}

export async function updateGuestConversationEmail(
  client: AmplifyDataClient,
  conversationId: string,
  emailRaw: string,
): Promise<string> {
  if (!client.mutations.updateGuestConversationEmail) {
    throw new Error(
      "Guest messages are not available yet. Redeploy the Amplify backend.",
    );
  }
  const session = await requireGuestSessionArgs();
  const { data, errors } = await client.mutations.updateGuestConversationEmail({
    guestId: session.guestId,
    guestToken: session.guestToken,
    conversationId,
    email: emailRaw.trim(),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data?.success) {
    throw new Error("Could not save email.");
  }
  return data.customerEmail?.trim() || emailRaw.trim().toLowerCase();
}

export async function replyAsGuest(
  client: AmplifyDataClient,
  conversationId: string,
  bodyRaw: string,
  imagePathsRaw?: string[],
): Promise<void> {
  if (!client.mutations.replyGuestConversation) {
    throw new Error(
      "Guest messages are not available yet. Redeploy the Amplify backend.",
    );
  }
  const session = await requireGuestSessionArgs();
  const { errors } = await client.mutations.replyGuestConversation({
    guestId: session.guestId,
    guestToken: session.guestToken,
    conversationId,
    body: bodyRaw,
    ...(imagePathsRaw?.length ? { imagePaths: imagePathsRaw } : {}),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export async function markConversationReadByGuest(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<void> {
  if (!client.mutations.markGuestConversationRead) return;
  const session = await requireGuestSessionArgs();
  const { errors } = await client.mutations.markGuestConversationRead({
    guestId: session.guestId,
    guestToken: session.guestToken,
    conversationId,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export async function deleteConversationAsGuest(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<void> {
  if (!client.mutations.deleteGuestConversation) {
    throw new Error(
      "Guest messages are not available yet. Redeploy the Amplify backend.",
    );
  }
  const session = await requireGuestSessionArgs();
  const { errors } = await client.mutations.deleteGuestConversation({
    guestId: session.guestId,
    guestToken: session.guestToken,
    conversationId,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export async function countUnreadForGuest(
  client: AmplifyDataClient,
): Promise<number> {
  try {
    const rows = await listGuestConversations(client);
    return rows.filter((row) => row.unreadForCustomer).length;
  } catch {
    return 0;
  }
}

export async function getGuestConversationById(
  client: AmplifyDataClient,
  conversationId: string,
): Promise<ConversationRecord | null> {
  const rows = await listGuestConversations(client);
  return rows.find((row) => row.id === conversationId) ?? null;
}
