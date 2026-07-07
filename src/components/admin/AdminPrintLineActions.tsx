import { useState } from "react";
import { getUrl } from "aws-amplify/storage";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { OrderLineItemSnapshot } from "@/lib/orderLineItems";
import {
  effectivePrintReviewStatus,
  printReviewStatusLabel,
  printPayloadFromOrderLine,
} from "@/lib/printService";
import { formatPrice } from "@/data/seedProducts";
import { getOrderById, type OrderRecord } from "@/services/orderService";
import { updatePrintLineReview } from "@/services/printReviewService";

type AdminPrintLineActionsProps = {
  client: AmplifyDataClient;
  order: OrderRecord;
  item: OrderLineItemSnapshot;
  onOrderUpdated: (order: OrderRecord) => void;
};

export function AdminPrintLineActions({
  client,
  order,
  item,
  onOrderUpdated,
}: AdminPrintLineActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const printService = printPayloadFromOrderLine(item);
  if (!printService?.storagePath) return null;

  const reviewStatus = effectivePrintReviewStatus(printService);
  const pending = reviewStatus === "pending_review";

  async function handleDownload() {
    if (!printService?.storagePath || printService.filePurgedAt) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getUrl({
        path: printService.storagePath,
        options: { expiresIn: 900 },
      });
      window.open(result.url.toString(), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(nextStatus: "approved" | "rejected") {
    if (!printService?.uploadId) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await updatePrintLineReview(client, {
        orderId: order.id,
        uploadId: printService.uploadId,
        reviewStatus: nextStatus,
        reviewNotes: nextStatus === "rejected" ? rejectNotes : undefined,
      });

      const refreshed = await getOrderById(client, order.id);
      if (!refreshed) {
        throw new Error("Could not reload order after review.");
      }

      onOrderUpdated(refreshed);
      setRejectOpen(false);
      setRejectNotes("");

      const parts = [`Print file ${printReviewStatusLabel(nextStatus).toLowerCase()}.`];
      if (result.notificationSent) parts.push("Customer notified in-app.");
      if (result.refundedCents > 0) {
        parts.push(`${formatPrice(result.refundedCents)} refunded on this order.`);
      }
      setMessage(parts.join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review update failed.");
    } finally {
      setLoading(false);
    }
  }

  const downloadLabel = printService.originalFileName?.toLowerCase().endsWith(".zip")
    ? "Download ZIP"
    : "Download STL";

  const statusTone =
    reviewStatus === "approved"
      ? "text-secondary"
      : reviewStatus === "rejected"
        ? "text-error"
        : "text-primary";

  return (
    <div className="mt-2 space-y-2 text-label-sm text-on-surface-variant">
      <p>
        File: {printService.originalFileName}
        <span className={`ml-2 font-label-sm uppercase ${statusTone}`}>
          · {printReviewStatusLabel(reviewStatus)}
        </span>
        {!printService.filePurgedAt && (
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={loading}
            className="ml-2 text-primary hover:underline disabled:opacity-50"
          >
            {loading && !rejectOpen ? "Working…" : downloadLabel}
          </button>
        )}
        {printService.filePurgedAt && (
          <span className="ml-2 text-secondary">· Purged after ship</span>
        )}
      </p>

      {printService.reviewNotes && reviewStatus === "rejected" && (
        <p className="text-body-sm text-on-surface">Note: {printService.reviewNotes}</p>
      )}

      {pending && order.status === "paid" && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleReview("approved")}
            className="bg-primary px-4 py-2 font-label-sm uppercase text-on-primary disabled:opacity-50"
          >
            Approve file
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRejectOpen((open) => !open)}
            className="border border-error/40 px-4 py-2 font-label-sm uppercase text-error disabled:opacity-50"
          >
            Reject file
          </button>
        </div>
      )}

      {rejectOpen && (
        <div className="space-y-2 border border-outline-variant/20 bg-surface-container p-3">
          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Rejection note (optional, shown to customer)
            </span>
            <textarea
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2 text-body-sm"
              placeholder="e.g. Mesh is not watertight; supports would require sculpting."
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleReview("rejected")}
              className="bg-error px-4 py-2 font-label-sm uppercase text-on-primary disabled:opacity-50"
            >
              Confirm reject & refund
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setRejectOpen(false);
                setRejectNotes("");
              }}
              className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase text-on-surface-variant"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-secondary">{message}</p>}
      {error && <p className="text-error">{error}</p>}
    </div>
  );
}
