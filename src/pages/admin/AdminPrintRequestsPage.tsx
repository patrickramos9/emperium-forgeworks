import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { resolveCustomerLabelsForUserIds } from "@/lib/customerAdmin";
import {
  formatPrintFigureLinesSummary,
  printRequestStatusLabel,
  printRequestSubmitterKind,
  printRequestSubmitterLabel,
  type PrintRequestRecord,
} from "@/lib/printRequest";
import { formatPrice } from "@/data/seedProducts";
import { listAllPrintRequests } from "@/services/printRequestService";

function queueRank(status: PrintRequestRecord["status"]): number {
  switch (status) {
    case "submitted":
      return 0;
    case "in_review":
      return 1;
    case "quoted":
      return 2;
    default:
      return 3;
  }
}

export function AdminPrintRequestsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PrintRequestRecord[]>([]);
  const [customerLabels, setCustomerLabels] = useState<
    Awaited<ReturnType<typeof resolveCustomerLabelsForUserIds>>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      try {
        const all = await listAllPrintRequests(client);
        setRows(
          all.sort(
            (a, b) =>
              queueRank(a.status) - queueRank(b.status) ||
              (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
          ),
        );
        const userIds = [
          ...new Set(
            all.map((row) => row.userId).filter(Boolean) as string[],
          ),
        ];
        setCustomerLabels(
          userIds.length
            ? await resolveCustomerLabelsForUserIds(client, userIds)
            : new Map(),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load requests.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Print requests
      </h1>
      <p className="mt-2 text-body-sm text-on-surface-variant">
        Review uploaded files, assign figure counts by size tier, and send quotes.
      </p>

      {loading && <p className="mt-6 text-on-surface-variant">Loading…</p>}
      {error && <p className="mt-6 text-error">{error}</p>}

      <ul className="mt-6 space-y-2">
        {rows.map((row) => {
          const kind = printRequestSubmitterKind(row);
          const submitter = printRequestSubmitterLabel(
            row,
            row.userId ? customerLabels.get(row.userId) : null,
          );
          const from = kind === "guest" ? `Guest · ${submitter}` : submitter;
          return (
            <li key={row.id}>
              <Link
                to={`/admin/print-requests/${row.id}`}
                className="flex flex-wrap items-baseline justify-between gap-2 border border-outline-variant/20 bg-surface-container-low px-4 py-3 iron-bevel hover:border-primary/40"
              >
                <span>
                  <span className="font-label-md uppercase text-on-surface">
                    {row.originalFileName}
                  </span>
                  <span className="ml-2 text-body-sm text-on-surface-variant">
                    {from}
                    {" · "}
                    {row.resinTypeLabel} · {row.resinColorLabel}
                    {row.figureLines?.length
                      ? ` · ${formatPrintFigureLinesSummary(row.figureLines)}`
                      : ""}
                    {row.quoteCents != null
                      ? ` · ${formatPrice(row.quoteCents)}`
                      : ""}
                  </span>
                </span>
                <span className="font-label-sm uppercase text-primary">
                  {printRequestStatusLabel(row.status)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {!loading && !rows.length && (
        <p className="mt-6 text-on-surface-variant">No print requests yet.</p>
      )}
    </div>
  );
}
