import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import {
  getCustomerDataClient,
  getGuestDataClient,
  requireCustomerSession,
} from "@/lib/amplifyDataClient";
import { hasCustomerSession } from "@/lib/customerAuth";
import {
  customerRowsToInbox,
  formatInboxDateTime,
  listCustomerNotifications,
  listGuestNotifications,
  listMyNotificationReads,
  markGuestNotificationRead,
  markNotificationRead,
  sortInboxByDate,
  type InboxNotification,
  type NotificationSortOrder,
} from "@/services/notificationService";
import { ensureGuestSession } from "@/services/guestSessionService";
import { PageFeedback } from "@/components/PageFeedback";

export function AccountNotificationsPage() {
  const navigate = useNavigate();
  const { refreshNotificationBadge } = useNotificationBadge();
  const [signedIn, setSignedIn] = useState(false);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [sortOrder, setSortOrder] = useState<NotificationSortOrder>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const session = await hasCustomerSession();
        setSignedIn(session);
        if (session) {
          const client = await requireCustomerSession(
            navigate,
            "/account/notifications",
          );
          if (!client) return;
          const [rows, readRows] = await Promise.all([
            listCustomerNotifications(client),
            listMyNotificationReads(client),
          ]);
          setNotifications(customerRowsToInbox(rows, readRows));
        } else {
          await ensureGuestSession();
          const client = await getGuestDataClient();
          if (!client?.queries.getGuestNotifications) {
            throw new Error(
              "Guest notifications are not available yet. Redeploy the Amplify backend.",
            );
          }
          setNotifications(await listGuestNotifications(client));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load notifications",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate]);

  const sortedNotifications = useMemo(
    () => sortInboxByDate(notifications, sortOrder),
    [notifications, sortOrder],
  );

  async function handleMarkRead(notificationId: string) {
    try {
      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) return;
        await markNotificationRead(client, notificationId);
      } else {
        await ensureGuestSession();
        const client = await getGuestDataClient();
        if (!client) return;
        await markGuestNotificationRead(client, notificationId);
      }
      setNotifications((prev) =>
        prev.map((row) =>
          row.id === notificationId ? { ...row, read: true } : row,
        ),
      );
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
          to={signedIn ? "/account" : "/shop"}
          className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
        >
          {signedIn ? "← Account" : "← Shop"}
        </Link>
      </div>

      {!signedIn && (
        <p className="mb-4 text-label-sm text-on-surface-variant">
          Guest inbox for this device.{" "}
          <Link to="/account/login" className="text-primary underline">
            Sign in
          </Link>{" "}
          to keep messages across browsers.
        </p>
      )}

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
            const sentAt = formatInboxDateTime(note);
            return (
              <li
                key={note.id}
                className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-headline-md text-on-surface">
                      {note.title}
                    </p>
                    <p className="text-label-sm uppercase text-on-surface-variant">
                      {note.kind} · {note.read ? "Read" : "Unread"}
                      {sentAt ? ` · ${sentAt}` : ""}
                    </p>
                  </div>
                  {!note.read && (
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(note.id)}
                      className="font-label-sm uppercase text-primary hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-on-surface-variant">
                  {note.body}
                </p>
                {note.kind === "order" && (
                  <>
                    <OrderNotificationLink body={note.body} />
                    <PrintRequestNotificationLink body={note.body} />
                  </>
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

function PrintRequestNotificationLink({ body }: { body: string }) {
  const match = body.match(/(\/account\/print-requests\/[a-zA-Z0-9-]+)/);
  if (!match) return null;
  const isQuote = /quote/i.test(body);
  return (
    <Link
      to={match[1]}
      className="mt-3 inline-block font-label-sm uppercase text-primary hover:underline"
    >
      {isQuote ? "Review and pay quote" : "View print request"}
    </Link>
  );
}
