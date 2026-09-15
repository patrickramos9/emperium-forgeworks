import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ConfirmDeleteActions } from "@/components/admin/ConfirmDeleteActions";
import { MessageImagePicker } from "@/components/MessageImagePicker";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { conversationParticipantLabel } from "@/lib/conversationParticipant";
import { resolveCustomerLabelsForUserIds } from "@/lib/customerAdmin";
import { hasConversationModel } from "@/lib/dataModels";
import { uploadMessageAttachments } from "@/lib/messageAttachmentUpload";
import {
  deleteConversationAsAdmin,
  findConversationForOrder,
  formatMessageTime,
  listAdminConversations,
  startAdminConversation,
  type ConversationRecord,
} from "@/services/messageInboxService";
import { getOrderById, type OrderRecord } from "@/services/orderService";

export function AdminMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterOrderId = searchParams.get("orderId")?.trim() || undefined;
  const composeRequested = searchParams.get("compose") === "1";

  const [rows, setRows] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showCompose, setShowCompose] = useState(composeRequested);
  const [composeOrder, setComposeOrder] = useState<OrderRecord | null>(null);
  const [composeEmail, setComposeEmail] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      if (!hasConversationModel(client)) {
        setError(
          "Messages are not available yet. Redeploy the Amplify backend.",
        );
        setLoading(false);
        return;
      }
      try {
        let list = await listAdminConversations(client);
        if (filterOrderId) {
          const existing = list.find((row) => row.orderId === filterOrderId);
          if (composeRequested && existing?.id) {
            navigate(`/admin/messages/${existing.id}`, { replace: true });
            return;
          }
          list = list.filter((row) => row.orderId === filterOrderId);
        }
        setRows(list);

        if (composeRequested && filterOrderId) {
          const order = await getOrderById(client, filterOrderId);
          if (!order) {
            setError("Order not found for messaging.");
            setShowCompose(false);
          } else if (!order.userId?.trim() && !order.guestId?.trim()) {
            setError(
              "This order has no buyer identity on file, so a message thread cannot be started.",
            );
            setShowCompose(false);
          } else {
            let email = order.email?.trim() || null;
            if (!email && order.userId) {
              const labels = await resolveCustomerLabelsForUserIds(client, [
                order.userId,
              ]);
              email = labels.get(order.userId)?.email?.trim() || null;
            }
            setComposeOrder(order);
            setComposeEmail(email);
            setShowCompose(true);
            setSubject(`Regarding your order ${filterOrderId.slice(0, 8)}…`);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate, filterOrderId, composeRequested]);

  async function handleDelete(conversationId: string) {
    setDeleting(true);
    setError(null);
    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      await deleteConversationAsAdmin(client, conversationId);
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

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    if (!composeOrder) {
      setError(
        "Pick an order from Order detail → Message Buyer to start a thread.",
      );
      return;
    }
    setSending(true);
    setError(null);
    setStatusMessage(null);
    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;

      const existing = await findConversationForOrder(client, composeOrder.id);
      if (existing?.id) {
        navigate(`/admin/messages/${existing.id}`);
        return;
      }

      const imagePaths =
        imageFiles.length > 0
          ? await uploadMessageAttachments(imageFiles)
          : undefined;

      const result = await startAdminConversation(client, {
        subject,
        body,
        orderId: composeOrder.id,
        userId: composeOrder.userId,
        guestId: composeOrder.guestId,
        customerEmail: composeEmail ?? composeOrder.email,
        ...(imagePaths ? { imagePaths } : {}),
      });

      const note = result.emailSent
        ? "Message sent. Customer email notification delivered."
        : (result.emailNote ??
          "Message saved, but customer email notification was not sent.");

      navigate(`/admin/messages/${result.conversation.id}`, {
        state: { statusMessage: note },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase text-primary">
            Messages
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Customer ↔ shop threads (not live chat)
          </p>
        </div>
      </div>

      {filterOrderId && (
        <p className="mt-4 text-label-sm text-on-surface-variant">
          {composeRequested ? "Messaging buyer for" : "Filtered by"} order{" "}
          {filterOrderId}.{" "}
          <Link to="/admin/messages" className="text-primary hover:underline">
            Show all
          </Link>
          {" · "}
          <Link
            to={`/admin/orders/${filterOrderId}`}
            className="text-primary hover:underline"
          >
            Open order
          </Link>
        </p>
      )}

      {error && <p className="mt-4 text-error">{error}</p>}
      {statusMessage && <p className="mt-4 text-secondary">{statusMessage}</p>}
      {loading && <p className="mt-4 text-on-surface-variant">Loading…</p>}

      {showCompose && composeOrder && (
        <form
          onSubmit={(e) => void handleStart(e)}
          className="mt-6 space-y-4 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
        >
          <h2 className="font-label-sm uppercase text-on-surface-variant">
            Message buyer
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Order {composeOrder.id.slice(0, 8)}…
            {composeEmail ? ` · ${composeEmail}` : " · No email on file yet"}
            {composeOrder.guestId ? " · Guest checkout" : ""}
          </p>
          {!composeEmail && (
            <p className="text-body-sm text-error">
              No email on this order — the message will save in-app, but an email
              alert may not send unless Cognito lookup finds an address.
            </p>
          )}
          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Subject
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={120}
              className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Message
            </span>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
              placeholder="Write to the buyer…"
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
            {sending ? "Sending…" : "Send message"}
          </button>
        </form>
      )}

      {!loading && !rows.length && !showCompose && (
        <p className="mt-4 text-on-surface-variant">No conversations yet.</p>
      )}

      <ul className="mt-stack-lg divide-y divide-outline-variant/20 border border-outline-variant/20">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-start justify-between gap-3 p-4 hover:bg-surface-container-high"
          >
            <Link
              to={`/admin/messages/${row.id}`}
              className="min-w-0 flex-1"
            >
              <p className="font-label-md text-on-surface">
                {row.unreadForAdmin ? (
                  <span className="mr-2 inline-block bg-primary px-2 py-0.5 text-label-sm uppercase text-on-primary">
                    Unread
                  </span>
                ) : null}
                {row.subject}
              </p>
              <p className="mt-1 text-label-sm text-on-surface-variant">
                {(() => {
                  const participant = conversationParticipantLabel(row);
                  return (
                    <>
                      {participant.isGuest ? (
                        <span className="mr-2 inline-block border border-outline-variant/40 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-on-surface-variant">
                          Guest
                        </span>
                      ) : null}
                      {participant.primary}
                    </>
                  );
                })()}
                {row.orderId ? ` · Order ${row.orderId.slice(0, 8)}…` : ""}
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
          </li>
        ))}
      </ul>
    </div>
  );
}
