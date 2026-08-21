import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getUrl } from "aws-amplify/storage";
import { formatPrice } from "@/data/seedProducts";
import { requireAdminSession, type AmplifyDataClient } from "@/lib/amplifyDataClient";
import {
  resolveCustomerLabelsForUserIds,
  type CustomerLabel,
} from "@/lib/customerAdmin";
import {
  buildQuotedFigureLines,
  formatPrintFigureLinesSummary,
  printRequestStatusLabel,
  printRequestSubmitterKind,
  printRequestSubmitterLabel,
  type PrintFigureLineInput,
  type PrintRequestRecord,
} from "@/lib/printRequest";
import type { PrintServiceConfigData } from "@/lib/printService";
import {
  adminDeclinePrintRequest,
  adminQuotePrintRequest,
  getPrintRequestById,
} from "@/services/printRequestService";
import { fetchPrintServiceConfig } from "@/services/printServiceConfigService";

type FigureDraft = { sizeTierId: string; quantity: string };

export function AdminPrintRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<AmplifyDataClient | null>(null);
  const [row, setRow] = useState<PrintRequestRecord | null>(null);
  const [customerLabel, setCustomerLabel] = useState<CustomerLabel | null>(
    null,
  );
  const [config, setConfig] = useState<PrintServiceConfigData | null>(null);
  const [drafts, setDrafts] = useState<FigureDraft[]>([
    { sizeTierId: "", quantity: "1" },
  ]);
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!id) {
        navigate("/admin/print-requests");
        return;
      }
      const session = await requireAdminSession(navigate);
      if (!session) return;
      setClient(session);
      try {
        const [request, cfg] = await Promise.all([
          getPrintRequestById(session, id),
          fetchPrintServiceConfig(),
        ]);
        if (!request) {
          navigate("/admin/print-requests");
          return;
        }
        setRow(request);
        setConfig(cfg);
        setAdminNotes(request.adminNotes ?? "");
        if (request.userId) {
          const labels = await resolveCustomerLabelsForUserIds(session, [
            request.userId,
          ]);
          setCustomerLabel(labels.get(request.userId) ?? null);
        } else {
          setCustomerLabel(null);
        }
        if (request.figureLines?.length) {
          setDrafts(
            request.figureLines.map((line) => ({
              sizeTierId: line.sizeTierId,
              quantity: String(line.quantity),
            })),
          );
        } else if (cfg.sizeTiers[0]) {
          setDrafts([{ sizeTierId: cfg.sizeTiers[0].id, quantity: "1" }]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load request.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const preview = useMemo(() => {
    if (!config || !row) return null;
    try {
      const inputs: PrintFigureLineInput[] = drafts
        .map((draft) => ({
          sizeTierId: draft.sizeTierId,
          quantity: Number(draft.quantity),
        }))
        .filter((line) => line.sizeTierId && line.quantity >= 1);
      if (!inputs.length) return null;
      return buildQuotedFigureLines(config, inputs, row.resinTypeId);
    } catch {
      return null;
    }
  }, [config, drafts, row]);

  async function handleDownload() {
    if (!row?.storagePath) return;
    setError(null);
    try {
      const result = await getUrl({
        path: row.storagePath,
        options: { expiresIn: 900 },
      });
      window.open(result.url.toString(), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  }

  async function handleQuote(event: FormEvent) {
    event.preventDefault();
    if (!client || !id || !row) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const figureLines: PrintFigureLineInput[] = drafts.map((draft) => ({
        sizeTierId: draft.sizeTierId,
        quantity: Number(draft.quantity),
      }));
      const result = await adminQuotePrintRequest(client, {
        printRequestId: id,
        figureLines,
        adminNotes: adminNotes.trim() || undefined,
      });
      const refreshed = await getPrintRequestById(client, id);
      if (refreshed) setRow(refreshed);
      setMessage(
        `Quote saved (${formatPrice(result.quoteCents)})${
          result.notificationSent
            ? " · Customer notified."
            : row?.guestId
              ? " · Guest was not notified (inbox create failed)."
              : ""
        }`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save quote.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecline() {
    if (!client || !id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await adminDeclinePrintRequest(client, {
        printRequestId: id,
        adminNotes: adminNotes.trim() || undefined,
      });
      const refreshed = await getPrintRequestById(client, id);
      if (refreshed) setRow(refreshed);
      setMessage(
        `Request declined${
          result.notificationSent
            ? " · Customer notified."
            : row?.guestId
              ? " · Guest was not notified (inbox create failed)."
              : ""
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decline.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading…</p>;
  }
  if (!row || !config) return null;

  const canEditQuote =
    row.status === "submitted" ||
    row.status === "in_review" ||
    row.status === "quoted";
  const submitterKind = printRequestSubmitterKind(row);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/admin/print-requests"
        className="font-label-sm uppercase text-primary hover:underline"
      >
        ← Print requests
      </Link>

      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        Print request
      </h1>
      <p className="mt-2 text-on-surface-variant">
        {printRequestStatusLabel(row.status)}
      </p>

      <dl className="mt-stack-lg space-y-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
        <div>
          <dt className="font-label-sm uppercase text-on-surface-variant">
            From
          </dt>
          <dd className="text-on-surface">
            {printRequestSubmitterLabel(row, customerLabel)}
            {submitterKind === "account" ? (
              <span className="ml-2 text-body-sm text-on-surface-variant">
                Account
              </span>
            ) : submitterKind === "guest" ? (
              <span className="ml-2 text-body-sm text-on-surface-variant">
                Guest
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="font-label-sm uppercase text-on-surface-variant">File</dt>
          <dd className="text-on-surface">
            {row.originalFileName}{" "}
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="ml-2 text-primary hover:underline"
            >
              Download
            </button>
          </dd>
        </div>
        <div>
          <dt className="font-label-sm uppercase text-on-surface-variant">Resin</dt>
          <dd>
            {row.resinTypeLabel} · {row.resinColorLabel}
          </dd>
        </div>
        {row.customerNotes && (
          <div>
            <dt className="font-label-sm uppercase text-on-surface-variant">
              Customer notes
            </dt>
            <dd>{row.customerNotes}</dd>
          </div>
        )}
        {row.orderId && (
          <div>
            <dt className="font-label-sm uppercase text-on-surface-variant">Order</dt>
            <dd>
              <Link
                to={`/admin/orders/${row.orderId}`}
                className="text-primary hover:underline"
              >
                {row.orderId}
              </Link>
            </dd>
          </div>
        )}
      </dl>

      {canEditQuote && (
        <form
          onSubmit={(e) => void handleQuote(e)}
          className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
        >
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            Figure lines / quote
          </h2>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            Assign how many figures fall in each size tier. Price = sum of (qty ×
            tier + resin delta).
          </p>

          <div className="mt-4 space-y-3">
            {drafts.map((draft, index) => (
              <div key={index} className="flex flex-wrap gap-3">
                <select
                  value={draft.sizeTierId}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[index] = { ...draft, sizeTierId: e.target.value };
                    setDrafts(next);
                  }}
                  className="border border-outline-variant/30 bg-surface px-3 py-2"
                  required
                >
                  <option value="">Size tier…</option>
                  {config.sizeTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.label} — {formatPrice(tier.priceCents)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft.quantity}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[index] = { ...draft, quantity: e.target.value };
                    setDrafts(next);
                  }}
                  className="w-24 border border-outline-variant/30 bg-surface px-3 py-2"
                  required
                />
                <button
                  type="button"
                  disabled={drafts.length <= 1}
                  onClick={() =>
                    setDrafts(drafts.filter((_, i) => i !== index))
                  }
                  className="text-label-sm uppercase text-error disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setDrafts([
                ...drafts,
                {
                  sizeTierId: config.sizeTiers[0]?.id ?? "",
                  quantity: "1",
                },
              ])
            }
            className="mt-3 font-label-sm uppercase text-primary hover:underline"
          >
            + Add size line
          </button>

          {preview && (
            <p className="mt-4 text-body-sm text-on-surface">
              Preview: {formatPrintFigureLinesSummary(preview.figureLines)} ·{" "}
              <strong>{formatPrice(preview.quoteCents)}</strong> before shipping
            </p>
          )}

          <label className="mt-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Admin notes (optional, shown to customer)
            </span>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save quote"}
            </button>
            <button
              type="button"
              disabled={saving || row.status === "declined"}
              onClick={() => void handleDecline()}
              className="border border-error/40 px-6 py-3 font-label-md uppercase text-error disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </form>
      )}

      {message && <p className="mt-4 text-secondary">{message}</p>}
      {error && <p className="mt-4 text-error">{error}</p>}
    </div>
  );
}
