import { useState } from "react";
import { getUrl } from "aws-amplify/storage";
import type { OrderLineItemSnapshot } from "@/lib/orderLineItems";

type AdminPrintLineActionsProps = {
  item: OrderLineItemSnapshot;
};

export function AdminPrintLineActions({ item }: AdminPrintLineActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printService = item.printService;
  if (!printService?.storagePath) return null;

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

  return (
    <div className="mt-2 space-y-1 text-label-sm text-on-surface-variant">
      <p>
        File: {printService.originalFileName}
        {printService.filePurgedAt ? (
          <span className="ml-2 text-secondary">· Purged after ship</span>
        ) : (
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={loading}
            className="ml-2 text-primary hover:underline disabled:opacity-50"
          >
            {loading ? "Opening…" : "Download STL"}
          </button>
        )}
      </p>
      {error && <p className="text-error">{error}</p>}
    </div>
  );
}
