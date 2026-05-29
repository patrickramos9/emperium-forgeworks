import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { listAdminNotifications, type NotificationRecord } from "@/services/notificationService";

export function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = await requireAdminSession(navigate);
    if (!client) {
      setLoading(false);
      return;
    }
    try {
      setRows(await listAdminNotifications(client));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Notifications
        </h1>
        <Link
          to="/admin/notifications/new"
          className="bg-primary px-4 py-2 font-label-md uppercase text-on-primary"
        >
          New notification
        </Link>
      </div>
      {error && <p className="mt-4 text-error">{error}</p>}
      {loading ? (
        <p className="mt-4 text-on-surface-variant">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-on-surface-variant">No notifications yet.</p>
      ) : (
        <ul className="mt-stack-lg divide-y divide-outline-variant/20 border border-outline-variant/20">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <Link
                  to={`/admin/notifications/${row.id}`}
                  className="font-headline-md text-on-surface hover:text-primary"
                >
                  {row.title}
                </Link>
                <p className="font-label-sm text-on-surface-variant">
                  {row.active ? "Active" : "Inactive"} · {row.kind ?? "system"}
                </p>
              </div>
              <Link
                to={`/admin/notifications/${row.id}`}
                className="font-label-sm uppercase text-primary hover:underline"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
