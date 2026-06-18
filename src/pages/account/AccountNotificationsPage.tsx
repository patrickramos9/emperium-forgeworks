import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import {
  formatNotificationDateTime,
  listCustomerNotifications,
  listMyNotificationReads,
  markNotificationRead,
  sortNotificationsByDate,
  type NotificationRecord,
  type NotificationSortOrder,
} from "@/services/notificationService";
import { PageFeedback } from "@/components/PageFeedback";

export function AccountNotificationsPage() {
  const navigate = useNavigate();
  const { refreshNotificationBadge } = useNotificationBadge();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<NotificationSortOrder>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const client = await requireCustomerSession(navigate, "/account/notifications");
      if (!client) return;
      try {
        const [rows, readRows] = await Promise.all([
          listCustomerNotifications(client),
          listMyNotificationReads(client),
        ]);
        setNotifications(rows);
        setReadIds(readRows.map((row) => row.notificationId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load notifications");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate]);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const sortedNotifications = useMemo(
    () => sortNotificationsByDate(notifications, sortOrder),
    [notifications, sortOrder],
  );

  async function handleMarkRead(notificationId: string) {
    const client = await requireCustomerSession(navigate, "/account/notifications");
    if (!client) return;
    try {
      await markNotificationRead(client, notificationId);
      setReadIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
      refreshNotificationBadge();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as read");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen mx-auto max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Loading notifications...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen mx-auto max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <div className="mb-stack-lg flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Notifications
        </h1>
        <Link
          to="/account"
          className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
        >
          ← Account
        </Link>
      </div>

      {notifications.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Sort
          </span>
          <button
            type="button"
            onClick={() => setSortOrder("newest")}
            className={`border px-3 py-1 font-label-sm uppercase ${
              sortOrder === "newest"
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant/30 text-on-surface-variant hover:border-primary/50"
            }`}
          >
            Newest first
          </button>
          <button
            type="button"
            onClick={() => setSortOrder("oldest")}
            className={`border px-3 py-1 font-label-sm uppercase ${
              sortOrder === "oldest"
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant/30 text-on-surface-variant hover:border-primary/50"
            }`}
          >
            Oldest first
          </button>
        </div>
      )}

      {error && <PageFeedback tone="error">{error}</PageFeedback>}

      {notifications.length === 0 ? (
        <p className="text-on-surface-variant">No notifications right now.</p>
      ) : (
        <ul className="space-y-4">
          {sortedNotifications.map((note) => {
            const isRead = readSet.has(note.id);
            const sentAt = formatNotificationDateTime(note);
            return (
              <li
                key={note.id}
                className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-headline-md text-on-surface">{note.title}</p>
                    <p className="text-label-sm uppercase text-on-surface-variant">
                      {note.kind ?? "system"} · {isRead ? "Read" : "Unread"}
                      {sentAt ? ` · ${sentAt}` : ""}
                    </p>
                  </div>
                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(note.id)}
                      className="font-label-sm uppercase text-primary hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-on-surface-variant">{note.body}</p>
                {note.kind === "order" && (
                  <OrderNotificationLink body={note.body} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function OrderNotificationLink({ body }: { body: string }) {
  const match = body.match(/(\/account\/orders\/[a-zA-Z0-9-]+)/);
  if (!match) return null;
  return (
    <Link
      to={match[1]}
      className="mt-3 inline-block font-label-sm uppercase text-primary hover:underline"
    >
      View order
    </Link>
  );
}
