import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { hasReviewModel } from "@/lib/dataModels";
import {
  deleteReview,
  listAllReviews,
  reviewDisplayName,
  setReviewApproved,
  type ReviewRecord,
} from "@/services/reviewService";

export function AdminReviewsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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
    if (!hasReviewModel(client)) {
      setError(
        "Review API is not deployed. Push backend changes and redeploy Amplify.",
      );
      setLoading(false);
      return;
    }
    try {
      setRows(await listAllReviews(client));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleApproved(orderId: string, approved: boolean) {
    const client = await requireAdminSession(navigate);
    if (!client) return;

    setSavingId(orderId);
    setError(null);
    try {
      await setReviewApproved(client, orderId, approved);
      setRows((prev) =>
        prev.map((row) =>
          row.orderId === orderId ? { ...row, approved } : row,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
    setSavingId(null);
  }

  async function handleDelete(orderId: string) {
    if (!window.confirm("Delete this review permanently?")) return;

    const client = await requireAdminSession(navigate);
    if (!client) return;

    setSavingId(orderId);
    setError(null);
    try {
      await deleteReview(client, orderId);
      setRows((prev) => prev.filter((row) => row.orderId !== orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
    setSavingId(null);
  }

  const pendingCount = rows.filter((row) => row.approved !== true).length;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Reviews
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Moderate customer reviews before they appear under{" "}
        <strong>Voices From The Void</strong> on the home page.
        {pendingCount > 0 && (
          <span className="ml-2 text-secondary">
            {pendingCount} pending
          </span>
        )}
      </p>

      {loading && (
        <p className="mt-4 text-on-surface-variant">Loading...</p>
      )}

      {error && <p className="mt-4 text-error">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="mt-4 text-on-surface-variant">No reviews yet.</p>
      )}

      <ul className="mt-6 space-y-4">
        {rows.map((row) => (
          <li
            key={row.orderId}
            className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-label-md text-on-surface">
                  {reviewDisplayName(row)} · {row.rating}/5
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  Order{" "}
                  <Link
                    to={`/admin/orders/${row.orderId}`}
                    className="text-primary hover:underline"
                  >
                    {row.orderId.slice(0, 8)}…
                  </Link>
                  {" · "}
                  {row.approved ? "Approved" : "Pending"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingId === row.orderId}
                  onClick={() =>
                    void handleToggleApproved(row.orderId, !row.approved)
                  }
                  className="border border-outline-variant/30 px-3 py-1 font-label-sm uppercase hover:border-primary disabled:opacity-50"
                >
                  {row.approved ? "Unapprove" : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={savingId === row.orderId}
                  onClick={() => void handleDelete(row.orderId)}
                  className="border border-error px-3 py-1 font-label-sm uppercase text-error disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-on-surface-variant">
              {row.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
