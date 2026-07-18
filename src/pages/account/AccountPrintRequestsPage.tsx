import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import {
  formatPrintFigureLinesSummary,
  printRequestStatusLabel,
  type PrintRequestRecord,
} from "@/lib/printRequest";
import { formatPrice } from "@/data/seedProducts";
import { listMyPrintRequests } from "@/services/printRequestService";

export function AccountPrintRequestsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PrintRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const client = await requireCustomerSession(
        navigate,
        "/account/print-requests",
      );
      if (!client) return;
      try {
        setRows(await listMyPrintRequests(client));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load requests.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  return (
    <main className="mx-auto max-w-container-max min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <div className="mb-stack-lg flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display-lg text-headline-lg uppercase text-primary">
          Print requests
        </h1>
        <Link
          to="/print"
          className="font-label-sm uppercase text-primary hover:underline"
        >
          New request
        </Link>
      </div>

      {loading && <p className="text-on-surface-variant">Loading…</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !rows.length && (
        <p className="text-on-surface-variant">
          No print requests yet.{" "}
          <Link to="/print" className="text-primary hover:underline">
            Submit a file
          </Link>
          .
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              to={`/account/print-requests/${row.id}`}
              className="block border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel hover:border-primary/40"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-label-md uppercase text-on-surface">
                  {row.originalFileName}
                </span>
                <span className="text-label-sm uppercase text-on-surface-variant">
                  {printRequestStatusLabel(row.status)}
                </span>
              </div>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {row.resinTypeLabel} · {row.resinColorLabel}
                {row.figureLines?.length
                  ? ` · ${formatPrintFigureLinesSummary(row.figureLines)}`
                  : ""}
                {row.quoteCents != null
                  ? ` · ${formatPrice(row.quoteCents)} before shipping`
                  : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
