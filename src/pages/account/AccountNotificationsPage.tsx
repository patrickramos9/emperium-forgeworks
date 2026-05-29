import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import {
  listCustomerNotifications,
  listMyNotificationReads,
  markNotificationRead,
  type NotificationRecord,
} from "@/services/notificationService";

export function AccountNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
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

  async function handleMarkRead(notificationId: string) {
    const client = await requireCustomerSession(navigate, "/account/notifications");
    if (!client) return;
    try {
      await markNotificationRead(client, notificationId);
      setReadIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
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

      {error && <p className="mb-4 text-error">{error}</p>}

      {notifications.length === 0 ? (
        <p className="text-on-surface-variant">No notifications right now.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((note) => {
            const isRead = readSet.has(note.id);
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
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
