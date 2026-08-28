import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDeleteActions } from "@/components/admin/ConfirmDeleteActions";
import { MessageAttachmentGallery } from "@/components/MessageAttachmentGallery";
import { MessageImagePicker } from "@/components/MessageImagePicker";
import {
  getCustomerDataClient,
  getGuestDataClient,
} from "@/lib/amplifyDataClient";
import { getCustomerUserId, hasCustomerSession } from "@/lib/customerAuth";
import { hasConversationModel } from "@/lib/dataModels";
import { uploadMessageAttachments } from "@/lib/messageAttachmentUpload";
import {
  deleteConversationAsCustomer,
  deleteConversationAsGuest,
  formatMessageTime,
  getConversationById,
  getGuestConversationById,
  listGuestMessagesForConversation,
  listMessagesForConversation,
  markConversationReadByCustomer,
  markConversationReadByGuest,
  replyAsCustomer,
  replyAsGuest,
  updateGuestConversationEmail,
  type ConversationRecord,
  type MessageRecord,
} from "@/services/messageInboxService";
import { ensureGuestSession } from "@/services/guestSessionService";

export function AccountMessageThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [conversation, setConversation] = useState<ConversationRecord | null>(
    null,
  );
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [body, setBody] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (!conversationId) {
        navigate("/account/messages");
        return;
      }
      try {
        const session = await hasCustomerSession();
        setSignedIn(session);
        if (session) {
          const client = await getCustomerDataClient();
          if (!client || !hasConversationModel(client)) {
            setError(
              "Messages are not available yet. Redeploy the Amplify backend.",
            );
            return;
          }
          const userId = await getCustomerUserId();
          const row = await getConversationById(client, conversationId);
          if (!row || row.userId !== userId) {
            setError("Conversation not found.");
            return;
          }
          setConversation(row);
          setMessages(await listMessagesForConversation(client, conversationId));
          await markConversationReadByCustomer(client, conversationId);
        } else {
          await ensureGuestSession();
          const client = await getGuestDataClient();
          if (!client?.queries.getGuestConversationMessages) {
            setError(
              "Guest messages are not available yet. Redeploy the Amplify backend.",
            );
            return;
          }
          const row = await getGuestConversationById(client, conversationId);
          if (!row) {
            setError("Conversation not found.");
            return;
          }
          setConversation(row);
          setMessages(
            await listGuestMessagesForConversation(client, conversationId),
          );
          await markConversationReadByGuest(client, conversationId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load thread.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [conversationId, navigate]);

  async function handleSaveAlertEmail(e: FormEvent) {
    e.preventDefault();
    if (!conversationId || signedIn) return;
    setSavingEmail(true);
    setError(null);
    setEmailSaved(false);
    try {
      const client = await getGuestDataClient();
      if (!client) throw new Error("Could not start guest session.");
      const saved = await updateGuestConversationEmail(
        client,
        conversationId,
        alertEmail,
      );
      setConversation((prev) =>
        prev ? { ...prev, customerEmail: saved } : prev,
      );
      setAlertEmail("");
      setEmailSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save email for alerts.",
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!conversationId) return;
    setSending(true);
    setError(null);
    try {
      const imagePaths =
        imageFiles.length > 0
          ? await uploadMessageAttachments(imageFiles)
          : undefined;

      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) return;
        await replyAsCustomer(client, conversationId, body, imagePaths);
        setBody("");
        setImageFiles([]);
        setMessages(await listMessagesForConversation(client, conversationId));
        const row = await getConversationById(client, conversationId);
        if (row) setConversation(row);
      } else {
        const client = await getGuestDataClient();
        if (!client) return;
        await replyAsGuest(client, conversationId, body, imagePaths);
        setBody("");
        setImageFiles([]);
        setMessages(
          await listGuestMessagesForConversation(client, conversationId),
        );
        const row = await getGuestConversationById(client, conversationId);
        if (row) setConversation(row);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!conversationId) return;
    setDeleting(true);
    setError(null);
    try {
      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) return;
        await deleteConversationAsCustomer(client, conversationId);
      } else {
        const client = await getGuestDataClient();
        if (!client) return;
        await deleteConversationAsGuest(client, conversationId);
      }
      navigate("/account/messages");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete conversation.",
      );
      setDeleting(false);
      setPendingDelete(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Loading conversation…</p>
      </main>
    );
  }

  if (error && !conversation) {
    return (
      <main className="mx-auto min-h-screen max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
        <p className="text-error">{error}</p>
        <Link
          to="/account/messages"
          className="mt-4 inline-block font-label-sm uppercase text-primary hover:underline"
        >
          ← Messages
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <div className="mb-stack-lg flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          {conversation?.subject ?? "Conversation"}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <ConfirmDeleteActions
            itemLabel={conversation?.subject ?? "conversation"}
            pending={pendingDelete}
            busy={deleting}
            onBegin={() => setPendingDelete(true)}
            onCancel={() => setPendingDelete(false)}
            onConfirm={() => void handleDelete()}
          />
          <Link
            to="/account/messages"
            className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
          >
            ← Messages
          </Link>
        </div>
      </div>

      {conversation?.orderId && (
        <p className="mb-4 text-label-sm text-on-surface-variant">
          Related order:{" "}
          <Link
            to={`/account/orders/${conversation.orderId}`}
            className="text-primary hover:underline"
          >
            View order
          </Link>
        </p>
      )}

      {!signedIn && conversation && !conversation.customerEmail?.trim() ? (
        <form
          onSubmit={(e) => void handleSaveAlertEmail(e)}
          className="mb-6 space-y-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
        >
          <p className="text-body-sm text-on-surface-variant">
            Add an email to get an alert when the shop replies (optional). You
            can still use the Messages inbox in this browser without it.
          </p>
          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Email for alerts
            </span>
            <input
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full max-w-md border border-outline-variant/30 bg-surface-container px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={savingEmail}
            className="border border-outline-variant/40 bg-surface px-4 py-2 font-label-sm uppercase text-on-surface disabled:opacity-50"
          >
            {savingEmail ? "Saving…" : "Save email"}
          </button>
        </form>
      ) : null}

      {!signedIn && conversation?.customerEmail?.trim() && emailSaved ? (
        <p className="mb-4 text-body-sm text-primary">
          Alerts will go to {conversation.customerEmail}.
        </p>
      ) : null}

      {error && <p className="mb-4 text-error">{error}</p>}

      <ul className="space-y-3">
        {messages.map((message) => {
          const fromShop = message.senderRole === "admin";
          return (
            <li
              key={message.id}
              className={`border p-4 iron-bevel ${
                fromShop
                  ? "border-primary/30 bg-surface-container-low"
                  : "border-outline-variant/20 bg-surface-container"
              }`}
            >
              <p className="font-label-sm uppercase text-on-surface-variant">
                {fromShop ? "Emperium Forgeworks" : "You"} ·{" "}
                {formatMessageTime(message.createdAt)}
              </p>
              {message.body && message.body !== "(Photo attached)" && (
                <p className="mt-2 whitespace-pre-wrap text-body-sm text-on-surface">
                  {message.body}
                </p>
              )}
              <MessageAttachmentGallery paths={message.imagePaths} />
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={(e) => void handleReply(e)}
        className="mt-stack-lg space-y-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
      >
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Reply
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            maxLength={4000}
            required={imageFiles.length === 0}
          />
        </label>
        <MessageImagePicker
          files={imageFiles}
          onChange={setImageFiles}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending}
          className="molten-glow bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send reply"}
        </button>
      </form>
    </main>
  );
}
