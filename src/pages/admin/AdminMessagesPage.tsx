import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { hasConversationModel } from "@/lib/dataModels";
import {
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
          <li key={row.id}>
            <Link
              to={`/admin/messages/${row.id}`}
              className="flex flex-wrap items-start justify-between gap-2 p-4 hover:bg-surface-container-high"
            >
              <div>
                <p className="font-label-md text-on-surface">
                  {row.unreadForAdmin ? (
                    <span className="mr-2 inline-block bg-primary px-2 py-0.5 text-label-sm uppercase text-on-primary">
                      Unread
                    </span>
                  ) : null}
                  {row.subject}
                </p>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  {row.customerEmail ?? "Customer"}
                  {row.orderId ? ` · Order ${row.orderId.slice(0, 8)}…` : ""}
                </p>
              </div>
              <p className="text-label-sm text-on-surface-variant">
                {formatMessageTime(row.lastMessageAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
