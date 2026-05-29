import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { hasSculptorModel } from "@/lib/dataModels";
import { listAllSculptors, type SculptorRecord } from "@/services/sculptorService";

export function AdminSculptorsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SculptorRecord[]>([]);
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
    if (!hasSculptorModel(client)) {
      setError(
        "Sculptor API is not deployed. Push backend changes and redeploy Amplify.",
      );
      setLoading(false);
      return;
    }
    try {
      setRows(await listAllSculptors(client));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sculptors");
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
          Sculptors
        </h1>
        <Link
          to="/admin/sculptors/new"
          className="bg-primary px-4 py-2 font-label-md uppercase text-on-primary"
        >
          New sculptor
        </Link>
      </div>

      {error && <p className="mt-4 text-error">{error}</p>}

      {loading ? (
        <p className="mt-4 text-on-surface-variant">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-on-surface-variant">No sculptors yet.</p>
      ) : (
        <ul className="mt-stack-lg divide-y divide-outline-variant/20 border border-outline-variant/20">
          {rows.map((row) => (
            <li
              key={row.slug}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <Link
                  to={`/admin/sculptors/${row.slug}`}
                  className="font-headline-md text-on-surface hover:text-primary"
                >
                  {row.name}
                </Link>
                <p className="font-label-sm text-on-surface-variant">
                  /sculptors/{row.slug}
                  {row.active ? " · Active" : " · Inactive"}
                </p>
              </div>
              <Link
                to={`/admin/sculptors/${row.slug}`}
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
