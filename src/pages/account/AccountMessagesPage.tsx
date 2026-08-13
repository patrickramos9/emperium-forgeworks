import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ConfirmDeleteActions } from "@/components/admin/ConfirmDeleteActions";
import { MessageImagePicker } from "@/components/MessageImagePicker";
import {
  getCustomerDataClient,
  getGuestDataClient,
} from "@/lib/amplifyDataClient";
import { hasCustomerSession } from "@/lib/customerAuth";
import { hasConversationModel } from "@/lib/dataModels";
import { uploadMessageAttachments } from "@/lib/messageAttachmentUpload";
import {
  deleteConversationAsCustomer,
  deleteConversationAsGuest,
  formatMessageTime,
  listCustomerConversations,
  listGuestConversations,
  startCustomerConversation,
  startGuestConversation,
  type ConversationRecord,
} from "@/services/messageInboxService";
import { ensureGuestSession } from "@/services/guestSessionService";

export function AccountMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId")?.trim() || undefined;
  const compose = searchParams.get("compose") === "1" || Boolean(orderId);

  const [signedIn, setSignedIn] = useState(false);
  const [rows, setRows] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(compose);
  const [subject, setSubject] = useState(
    orderId ? `Order ${orderId.slice(0, 8)}…` : "",
  );
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const session = await hasCustomerSession();
        setSignedIn(session);
        if (session) {
          const client = await getCustomerDataClient();
          if (!client) {
            navigate(
              `/account/login?returnTo=${encodeURIComponent("/account/messages")}`,
              { replace: true },
            );
            return;
          }
          if (!hasConversationModel(client)) {
            setError(
              "Messages are not available yet. Redeploy the Amplify backend.",
            );
            return;
          }
          setRows(await listCustomerConversations(client));
        } else {
          await ensureGuestSession();
          const client = await getGuestDataClient();
          if (!client?.queries.getGuestConversations) {
            setError(
              "Guest messages are not available yet. Redeploy the Amplify backend.",
            );
            return;
          }
          setRows(await listGuestConversations(client));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate]);

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const imagePaths =
        imageFiles.length > 0
          ? await uploadMessageAttachments(imageFiles)
          : undefined;

      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) {
          navigate(
            `/account/login?returnTo=${encodeURIComponent("/account/messages?compose=1")}`,
          );
          return;
        }
        const conversation = await startCustomerConversation(client, {
          subject,
          body,
          ...(orderId ? { orderId } : {}),
          ...(imagePaths ? { imagePaths } : {}),
        });
        navigate(`/account/messages/${conversation.id}`);
        return;
      }

      const client = await getGuestDataClient();
      if (!client) throw new Error("Could not start guest session.");
      const conversation = await startGuestConversation(client, {
        subject,
        body,
        email,
        ...(orderId ? { orderId } : {}),
        ...(imagePaths ? { imagePaths } : {}),
      });
      navigate(`/account/messages/${conversation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
      setSending(false);
    }
  }

  async function handleDelete(conversationId: string) {
    setDeleting(true);
    setError(null);
    try {
      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) throw new Error("Sign in to delete a conversation.");
        await deleteConversationAsCustomer(client, conversationId);
      } else {
        const client = await getGuestDataClient();
        if (!client) throw new Error("Could not start guest session.");
        await deleteConversationAsGuest(client, conversationId);
      }
      setRows((prev) => prev.filter((row) => row.id !== conversationId));
      setPendingDeleteId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete conversation.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Loading messages…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <div className="mb-stack-lg flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Messages
        </h1>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setShowCompose((v) => !v)}
            className="font-label-sm uppercase text-primary hover:underline"
          >
            {showCompose ? "Hide form" : "New message"}
          </button>
          <Link
            to={signedIn ? "/account" : "/"}
            className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
          >
            {signedIn ? "← Account" : "← Home"}
          </Link>
        </div>
      </div>

      <p className="mb-6 max-w-2xl text-body-sm text-on-surface-variant">
        Message the shop about an order or a product question. We usually
        respond within a couple of hours. You can attach photos
        {!signedIn
          ? ". Guests: include your email so we can reach you; create an account anytime to keep your threads."
          : "."}
      </p>

      {error && <p className="mb-4 text-error">{error}</p>}

      {showCompose && (
        <form
          onSubmit={(e) => void handleStart(e)}
          className="mb-stack-lg space-y-4 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
        >
          <h2 className="font-headline-md uppercase text-on-surface">
            New conversation
          </h2>
          {orderId && (
            <p className="text-label-sm text-on-surface-variant">
              Linked to order{" "}
              <Link
                to={`/account/orders/${orderId}`}
                className="text-primary hover:underline"
              >
                {orderId}
              </Link>
            </p>
          )}
          {!signedIn && (
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Your email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
                required
                autoComplete="email"
              />
            </label>
          )}
          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Subject
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
              maxLength={120}
              required
            />
          </label>
          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Message
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
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
            {sending ? "Sending…" : "Send message"}
          </button>
        </form>
      )}

      {!rows.length ? (
        <p className="text-on-surface-variant">
          No messages yet.{" "}
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="text-primary underline"
          >
            Start a conversation
          </button>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  to={`/account/messages/${row.id}`}
                  className="min-w-0 flex-1 hover:text-primary"
                >
                  <p className="font-label-md text-on-surface">
                    {row.unreadForCustomer ? (
                      <span className="mr-2 inline-block bg-primary px-2 py-0.5 text-label-sm uppercase text-on-primary">
                        New
                      </span>
                    ) : null}
                    {row.subject}
                  </p>
                  <p className="mt-1 text-label-sm text-on-surface-variant">
                    {formatMessageTime(row.lastMessageAt)}
                  </p>
                </Link>
                <ConfirmDeleteActions
                  itemLabel={row.subject}
                  pending={pendingDeleteId === row.id}
                  busy={deleting && pendingDeleteId === row.id}
                  onBegin={() => setPendingDeleteId(row.id)}
                  onCancel={() => setPendingDeleteId(null)}
                  onConfirm={() => void handleDelete(row.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
