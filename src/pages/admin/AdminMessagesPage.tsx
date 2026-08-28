import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ConfirmDeleteActions } from "@/components/admin/ConfirmDeleteActions";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { conversationParticipantLabel } from "@/lib/conversationParticipant";
import { hasConversationModel } from "@/lib/dataModels";
import {
  deleteConversationAsAdmin,
  formatMessageTime,
  listAdminConversations,
  type ConversationRecord,
} from "@/services/messageInboxService";

export function AdminMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterOrderId = searchParams.get("orderId")?.trim() || undefined;
  const [rows, setRows] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
          list = list.filter((row) => row.orderId === filterOrderId);
        }
        setRows(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate, filterOrderId]);

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
          Filtered by order {filterOrderId}.{" "}
          <Link to="/admin/messages" className="text-primary hover:underline">
            Show all
          </Link>
        </p>
      )}

      {error && <p className="mt-4 text-error">{error}</p>}
      {loading && <p className="mt-4 text-on-surface-variant">Loading…</p>}

      {!loading && !rows.length && (
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
