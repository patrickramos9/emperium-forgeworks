import { FormEvent, useEffect, useId, useMemo, useState } from "react";
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
  formatPrintRequestSizing,
  printRequestSizingKindLabel,
  printRequestStatusLabel,
  printRequestSubmitterKind,
  printRequestSubmitterLabel,
  type PrintFigureLineInput,
  type PrintQuoteAttachment,
  type PrintRequestRecord,
} from "@/lib/printRequest";
import {
  QUOTE_ATTACHMENT_MAX_COUNT,
  QUOTE_ATTACHMENT_MAX_BYTES,
  assertQuoteAttachmentFile,
  resolvePrintQuoteAttachmentUrl,
  uploadPrintQuoteAttachments,
} from "@/lib/printQuoteAttachmentUpload";
import type { PrintServiceConfigData } from "@/lib/printService";
import { resolvePrintServicePriceCents } from "@/lib/printService";
import {
  adminDeclinePrintRequest,
  adminQuotePrintRequest,
  getPrintRequestById,
} from "@/services/printRequestService";
import { fetchPrintServiceConfig } from "@/services/printServiceConfigService";

type FigureDraft = {
  sizeTierId: string;
  quantity: string;
  /** Dollars string for the editable unit price input. */
  unitPriceDollars: string;
};

function centsToDollarsInput(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function dollarsInputToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function defaultUnitPriceDollars(
  config: PrintServiceConfigData,
  sizeTierId: string,
  resinTypeId: string,
): string {
  if (!sizeTierId) return "";
  const cents = resolvePrintServicePriceCents(config, sizeTierId, resinTypeId);
  return cents == null ? "" : centsToDollarsInput(cents);
}

export function AdminPrintRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quoteFileInputId = useId();
  const [client, setClient] = useState<AmplifyDataClient | null>(null);
  const [row, setRow] = useState<PrintRequestRecord | null>(null);
  const [customerLabel, setCustomerLabel] = useState<CustomerLabel | null>(
    null,
  );
  const [config, setConfig] = useState<PrintServiceConfigData | null>(null);
  const [drafts, setDrafts] = useState<FigureDraft[]>([
    { sizeTierId: "", quantity: "1", unitPriceDollars: "" },
  ]);
  const [adminNotes, setAdminNotes] = useState("");
  const [quoteAttachments, setQuoteAttachments] = useState<
    PrintQuoteAttachment[]
  >([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!id) {
        navigate("/admin/print-requests");
        return;
      }
      const session = await requireAdminSession(navigate);
      if (!session || cancelled) return;
      setClient(session);
      try {
        const [request, cfg] = await Promise.all([
          getPrintRequestById(session, id),
          fetchPrintServiceConfig(),
        ]);
        if (cancelled) return;
        if (!request) {
          navigate("/admin/print-requests");
          return;
        }
        setRow(request);
        setConfig(cfg);
        setAdminNotes(request.adminNotes ?? "");
        setQuoteAttachments(request.quoteAttachments ?? []);
        setPendingFiles([]);
        if (request.userId) {
          const labels = await resolveCustomerLabelsForUserIds(session, [
            request.userId,
          ]);
          if (cancelled) return;
          setCustomerLabel(labels.get(request.userId) ?? null);
        } else {
          setCustomerLabel(null);
        }
        if (request.figureLines?.length) {
          setDrafts(
            request.figureLines.map((line) => ({
              sizeTierId: line.sizeTierId,
              quantity: String(line.quantity),
              unitPriceDollars: centsToDollarsInput(line.unitPriceCents),
            })),
          );
        } else if (cfg.sizeTiers[0]) {
          const tierId = cfg.sizeTiers[0].id;
          setDrafts([
            {
              sizeTierId: tierId,
              quantity: "1",
              unitPriceDollars: defaultUnitPriceDollars(
                cfg,
                tierId,
                request.resinTypeId,
              ),
            },
          ]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load request.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const preview = useMemo(() => {
    if (!config || !row) return null;
    try {
      const inputs: PrintFigureLineInput[] = [];
      for (const draft of drafts) {
        if (!draft.sizeTierId || Number(draft.quantity) < 1) continue;
        const unitPriceCents = dollarsInputToCents(draft.unitPriceDollars);
        if (unitPriceCents == null) return null;
        inputs.push({
          sizeTierId: draft.sizeTierId,
          quantity: Number(draft.quantity),
          unitPriceCents,
        });
      }
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

  async function handleDownloadAttachment(path: string) {
    setError(null);
    try {
      const url = await resolvePrintQuoteAttachmentUrl(path);
      if (!url) throw new Error("Could not open attachment.");
      window.open(url, "_blank", "noopener,noreferrer");
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
      const figureLines: PrintFigureLineInput[] = [];
      for (const draft of drafts) {
        const unitPriceCents = dollarsInputToCents(draft.unitPriceDollars);
        if (unitPriceCents == null) {
          throw new Error("Enter a valid unit price for each figure line.");
        }
        figureLines.push({
          sizeTierId: draft.sizeTierId,
          quantity: Number(draft.quantity),
          unitPriceCents,
        });
      }

      const totalAttachments = quoteAttachments.length + pendingFiles.length;
      if (totalAttachments > QUOTE_ATTACHMENT_MAX_COUNT) {
        throw new Error(
          `Attach up to ${QUOTE_ATTACHMENT_MAX_COUNT} files per quote.`,
        );
      }
      const uploaded = pendingFiles.length
        ? await uploadPrintQuoteAttachments(id, pendingFiles)
        : [];
      const attachments = [...quoteAttachments, ...uploaded];

      const result = await adminQuotePrintRequest(client, {
        printRequestId: id,
        figureLines,
        adminNotes: adminNotes.trim() || undefined,
        quoteAttachments: attachments,
      });
      const refreshed = await getPrintRequestById(client, id);
      if (refreshed) {
        setRow(refreshed);
        setQuoteAttachments(refreshed.quoteAttachments ?? []);
      }
      setPendingFiles([]);
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
  const sizingLabel = formatPrintRequestSizing(row);
  const sizingKind = printRequestSizingKindLabel(row);

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
        {sizingLabel && sizingKind && (
          <div>
            <dt className="font-label-sm uppercase text-on-surface-variant">
              {sizingKind}
            </dt>
            <dd>{sizingLabel}</dd>
          </div>
        )}
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
            Pick a size tier for the label, set quantity, and enter the unit
            price. Changing the tier prefills the catalog price (tier + resin);
            you can edit it.
          </p>

          <div className="mt-4 space-y-3">
            {drafts.map((draft, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <label className="min-w-[12rem] flex-1">
                  <span className="font-label-sm uppercase text-on-surface-variant">
                    Size tier
                  </span>
                  <select
                    value={draft.sizeTierId}
                    onChange={(e) => {
                      const sizeTierId = e.target.value;
                      const next = [...drafts];
                      next[index] = {
                        ...draft,
                        sizeTierId,
                        unitPriceDollars: config
                          ? defaultUnitPriceDollars(
                              config,
                              sizeTierId,
                              row.resinTypeId,
                            )
                          : draft.unitPriceDollars,
                      };
                      setDrafts(next);
                    }}
                    className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
                    required
                  >
                    <option value="">Size tier…</option>
                    {config.sizeTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.label} — {formatPrice(tier.priceCents)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="font-label-sm uppercase text-on-surface-variant">
                    Qty
                  </span>
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
                    className="mt-1 w-20 border border-outline-variant/30 bg-surface px-3 py-2"
                    required
                  />
                </label>
                <label>
                  <span className="font-label-sm uppercase text-on-surface-variant">
                    Unit price ($)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    inputMode="decimal"
                    value={draft.unitPriceDollars}
                    onChange={(e) => {
                      const next = [...drafts];
                      next[index] = {
                        ...draft,
                        unitPriceDollars: e.target.value,
                      };
                      setDrafts(next);
                    }}
                    className="mt-1 w-28 border border-outline-variant/30 bg-surface px-3 py-2"
                    required
                  />
                </label>
                <button
                  type="button"
                  disabled={drafts.length <= 1}
                  onClick={() =>
                    setDrafts(drafts.filter((_, i) => i !== index))
                  }
                  className="mb-2 text-label-sm uppercase text-error disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const sizeTierId = config.sizeTiers[0]?.id ?? "";
              setDrafts([
                ...drafts,
                {
                  sizeTierId,
                  quantity: "1",
                  unitPriceDollars: defaultUnitPriceDollars(
                    config,
                    sizeTierId,
                    row.resinTypeId,
                  ),
                },
              ]);
            }}
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

          <div className="mt-4">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Quote attachments (optional)
            </span>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Images, PDF, ZIP, or text — up to {QUOTE_ATTACHMENT_MAX_COUNT}{" "}
              files, {(QUOTE_ATTACHMENT_MAX_BYTES / (1024 * 1024)).toFixed(0)}{" "}
              MB each. Customer can download from their print request page.
            </p>
            {quoteAttachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {quoteAttachments.map((file) => (
                  <li
                    key={file.storagePath}
                    className="flex flex-wrap items-center gap-3 text-body-sm text-on-surface"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownloadAttachment(file.storagePath)
                      }
                      className="text-primary hover:underline"
                    >
                      {file.fileName}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuoteAttachments((prev) =>
                          prev.filter(
                            (row) => row.storagePath !== file.storagePath,
                          ),
                        )
                      }
                      className="font-label-sm uppercase text-error"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {pendingFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {pendingFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="flex flex-wrap items-center gap-3 text-body-sm text-on-surface"
                  >
                    <span>
                      Ready to upload: <strong>{file.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className="font-label-sm uppercase text-error"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label
                htmlFor={quoteFileInputId}
                className={`inline-flex cursor-pointer border border-outline-variant/30 bg-surface-container px-3 py-2 font-label-sm uppercase text-on-surface hover:border-primary ${
                  quoteAttachments.length + pendingFiles.length >=
                  QUOTE_ATTACHMENT_MAX_COUNT
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                Choose files
              </label>
              <input
                id={quoteFileInputId}
                type="file"
                multiple
                accept="image/*,.pdf,.zip,.txt,application/pdf,application/zip,text/plain"
                className="sr-only"
                disabled={
                  quoteAttachments.length + pendingFiles.length >=
                  QUOTE_ATTACHMENT_MAX_COUNT
                }
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  e.target.value = "";
                  if (!files.length) return;
                  try {
                    for (const file of files) {
                      assertQuoteAttachmentFile(file);
                    }
                    if (
                      quoteAttachments.length +
                        pendingFiles.length +
                        files.length >
                      QUOTE_ATTACHMENT_MAX_COUNT
                    ) {
                      throw new Error(
                        `Attach up to ${QUOTE_ATTACHMENT_MAX_COUNT} files per quote.`,
                      );
                    }
                    setPendingFiles((prev) => [...prev, ...files]);
                    setError(null);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Could not add attachment.",
                    );
                  }
                }}
              />
              {pendingFiles.length === 0 && quoteAttachments.length === 0 ? (
                <span className="text-body-sm text-on-surface-variant">
                  No files selected
                </span>
              ) : null}
            </div>
          </div>

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

      {!canEditQuote && (row.quoteAttachments?.length ?? 0) > 0 ? (
        <div className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          <h2 className="font-label-sm uppercase text-on-surface-variant">
            Quote attachments
          </h2>
          <ul className="mt-2 space-y-1">
            {(row.quoteAttachments ?? []).map((file) => (
              <li key={file.storagePath}>
                <button
                  type="button"
                  onClick={() => void handleDownloadAttachment(file.storagePath)}
                  className="text-primary hover:underline"
                >
                  {file.fileName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message && <p className="mt-4 text-secondary">{message}</p>}
      {error && <p className="mt-4 text-error">{error}</p>}
    </div>
  );
}
