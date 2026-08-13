import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageAttachmentGallery } from "@/components/MessageAttachmentGallery";
import { MessageImagePicker } from "@/components/MessageImagePicker";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { hasConversationModel } from "@/lib/dataModels";
import { uploadMessageAttachments } from "@/lib/messageAttachmentUpload";
import {
  formatMessageTime,
  getConversationById,
  listMessagesForConversation,
  markConversationReadByAdmin,
  replyAsAdmin,
  type ConversationRecord,
  type MessageRecord,
} from "@/services/messageInboxService";

export function AdminMessageThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationRecord | null>(
    null,
  );
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [body, setBody] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!conversationId) {
        navigate("/admin/messages");
        return;
      }
      const client = await requireAdminSession(navigate);
      if (!client || !hasConversationModel(client)) {
        setError(
          "Messages are not available yet. Redeploy the Amplify backend.",
        );
        setLoading(false);
        return;
      }
      try {
        const row = await getConversationById(client, conversationId);
        if (!row) {
          setError("Conversation not found.");
          return;
        }
        setConversation(row);
        setMessages(await listMessagesForConversation(client, conversationId));
        await markConversationReadByAdmin(client, conversationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load thread.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [conversationId, navigate]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!conversationId) return;
    setSending(true);
    setError(null);
    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      const imagePaths =
        imageFiles.length > 0
          ? await uploadMessageAttachments(imageFiles)
          : undefined;
      await replyAsAdmin(client, conversationId, body, imagePaths);
      setBody("");
      setImageFiles([]);
      setMessages(await listMessagesForConversation(client, conversationId));
      const row = await getConversationById(client, conversationId);
      if (row) setConversation(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading conversation…</p>;
  }

  if (error && !conversation) {
    return (
      <div>
        <p className="text-error">{error}</p>
        <Link
          to="/admin/messages"
          className="mt-4 inline-block font-label-sm uppercase text-primary hover:underline"
        >
          ← Messages
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-stack-lg flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase text-primary">
            {conversation?.subject ?? "Conversation"}
          </h1>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            {conversation?.customerEmail ?? conversation?.userId}
            {conversation?.orderId ? (
              <>
                {" · "}
                <Link
                  to={`/admin/orders/${conversation.orderId}`}
                  className="text-primary hover:underline"
                >
                  View order
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <Link
          to="/admin/messages"
          className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
        >
          ← Messages
        </Link>
      </div>

      {error && <p className="mb-4 text-error">{error}</p>}

      <ul className="space-y-3">
        {messages.map((message) => {
          const fromShop = message.senderRole === "admin";
          return (
            <li
              key={message.id}
              className={`border p-4 ${
                fromShop
                  ? "border-primary/30 bg-surface-container-high"
                  : "border-outline-variant/20 bg-surface-container-low"
              }`}
            >
              <p className="font-label-sm uppercase text-on-surface-variant">
                {fromShop ? "Shop" : "Customer"} ·{" "}
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
        className="mt-stack-lg space-y-3 border border-outline-variant/20 bg-surface-container p-4"
      >
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Reply
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
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
          className="bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send reply"}
        </button>
      </form>
    </div>
  );
}
