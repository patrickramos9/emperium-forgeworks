import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { hasAnnouncementModel } from "@/lib/dataModels";
import { listAllAnnouncements } from "@/lib/listAllAnnouncements";

interface Row {
  id: string;
  title: string;
  active: boolean;
  pinned: boolean;
}

export function AdminAnnouncementsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const configured = await configureAmplify();
    if (!configured) {
      setError("Amplify is not configured.");
      setLoading(false);
      return;
    }
    const client = await requireAdminSession(navigate);
    if (!client) {
      setLoading(false);
      return;
    }
    if (!hasAnnouncementModel(client)) {
      setError(
        "Announcement API is not deployed. Push backend changes and redeploy Amplify.",
      );
      setLoading(false);
      return;
    }
    try {
      const data = await listAllAnnouncements(client);
      setRows(
        data.map((r) => ({
          id: r.id,
          title: r.title,
          active: r.active ?? true,
          pinned: r.pinned ?? false,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Announcements
        </h1>
        <Link
          to="/admin/announcements/new"
          className="bg-primary px-4 py-2 font-label-md uppercase text-on-primary"
        >
          New announcement
        </Link>
      </div>
      {error && <p className="mt-4 text-error">{error}</p>}
      {loading ? (
        <p className="mt-4 text-on-surface-variant">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-on-surface-variant">No announcements yet.</p>
      ) : (
        <ul className="mt-stack-lg divide-y divide-outline-variant/20 border border-outline-variant/20">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <Link
                  to={`/admin/announcements/${row.id}`}
                  className="font-headline-md text-on-surface hover:text-primary"
                >
                  {row.title}
                </Link>
                <p className="font-label-sm text-on-surface-variant">
                  {row.active ? "Active" : "Inactive"}
                  {row.pinned ? " · Pinned" : ""}
                </p>
              </div>
              <Link
                to={`/admin/announcements/${row.id}`}
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
