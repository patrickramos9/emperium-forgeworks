import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StarRatingInput } from "@/components/ReviewCard";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { hasReviewModel } from "@/lib/dataModels";
import { resolveImageUrl } from "@/lib/productImageUrls";
import {
  MAX_REVIEW_IMAGES,
  uploadReviewImages,
} from "@/lib/reviewImageUpload";
import {
  createImportedReview,
  deleteReview,
  generateImportedReviewId,
  isImportedReview,
  listAllReviews,
  reviewDisplayName,
  reviewImagePaths,
  setReviewApproved,
  type ReviewRecord,
} from "@/services/reviewService";

function clearObjectUrls(urls: string[]) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}

function AdminReviewThumbnails({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const resolved = await Promise.all(paths.map((path) => resolveImageUrl(path)));
      if (!cancelled) {
        setUrls(resolved.filter((url): url is string => Boolean(url)));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (urls.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {urls.map((url) => (
        <img
          key={url}
          src={url}
          alt="Customer product photo"
          className="h-14 w-14 border border-outline-variant/20 object-cover"
        />
      ))}
    </div>
  );
}

export function AdminReviewsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(true);
  const [importRating, setImportRating] = useState(5);
  const [importText, setImportText] = useState("");
  const [importDisplayName, setImportDisplayName] = useState("");
  const [importApproved, setImportApproved] = useState(true);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importPreviews, setImportPreviews] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearObjectUrls(importPreviews);
    };
  }, [importPreviews]);

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

  async function handleImportSubmit(e: FormEvent) {
    e.preventDefault();
    setImporting(true);
    setError(null);
    setImportSuccess(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setImporting(false);
      return;
    }

    try {
      const orderId = generateImportedReviewId();
      const images =
        importFiles.length > 0
          ? await uploadReviewImages(orderId, importFiles)
          : undefined;

      const created = await createImportedReview(client, {
        orderId,
        rating: importRating,
        text: importText,
        displayName: importDisplayName,
        approved: importApproved,
        images,
      });
      setRows((prev) =>
        [created, ...prev].sort(
          (a, b) =>
            Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""),
        ),
      );
      setImportText("");
      setImportDisplayName("");
      setImportRating(5);
      setImportApproved(true);
      clearObjectUrls(importPreviews);
      setImportFiles([]);
      setImportPreviews([]);
      setImportSuccess("Etsy review imported.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
    setImporting(false);
  }

  function handleImportFilesSelected(files: FileList | null) {
    if (!files?.length) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) return;

    const combined = [...importFiles, ...imageFiles].slice(0, MAX_REVIEW_IMAGES);
    clearObjectUrls(importPreviews);
    setImportFiles(combined);
    setImportPreviews(combined.map((file) => URL.createObjectURL(file)));
  }

  function removeImportFile(index: number) {
    URL.revokeObjectURL(importPreviews[index] ?? "");
    setImportFiles((prev) => prev.filter((_, i) => i !== index));
    setImportPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  const pendingCount = rows.filter((row) => row.approved !== true).length;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Reviews
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Moderate customer reviews before they appear under{" "}
        <strong>Voices From The Void</strong> on the home page. Copy Etsy
        reviews into the form below to publish them on your storefront.
        {pendingCount > 0 && (
          <span className="ml-2 text-secondary">
            {pendingCount} pending
          </span>
        )}
      </p>

      <section className="mt-6 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
        <button
          type="button"
          onClick={() => setImportOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="font-label-md uppercase text-on-surface">
            Import Etsy review
          </span>
          <span className="font-label-sm text-on-surface-variant">
            {importOpen ? "Hide" : "Show"}
          </span>
        </button>

        {importOpen && (
          <form onSubmit={(e) => void handleImportSubmit(e)} className="mt-4">
            <p className="text-label-sm text-on-surface-variant">
              Paste the reviewer name, star rating, and review text from your
              Etsy shop. If the review includes product photos, right-click them
              on Etsy, save the images, then upload them here (up to{" "}
              {MAX_REVIEW_IMAGES}). Imported reviews show an &ldquo;Etsy
              Customer&rdquo; badge on the storefront.
            </p>

            <label className="mt-4 block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Customer name
              </span>
              <input
                type="text"
                value={importDisplayName}
                onChange={(e) => setImportDisplayName(e.target.value)}
                placeholder="e.g. Christian"
                className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2 text-on-surface"
              />
            </label>

            <div className="mt-4">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Rating
              </span>
              <div className="mt-2">
                <StarRatingInput
                  value={importRating}
                  onChange={setImportRating}
                />
              </div>
            </div>

            <label className="mt-4 block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Review text
              </span>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={4}
                required
                minLength={10}
                placeholder="Paste the review from Etsy…"
                className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2 text-on-surface"
              />
            </label>

            <div className="mt-4">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Product photos (optional)
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer border border-outline-variant/30 px-3 py-2 font-label-sm uppercase hover:border-primary">
                  Add photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    disabled={importFiles.length >= MAX_REVIEW_IMAGES}
                    onChange={(e) => {
                      handleImportFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="text-label-sm text-on-surface-variant">
                  {importFiles.length}/{MAX_REVIEW_IMAGES}
                </span>
              </div>
              {importPreviews.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {importPreviews.map((preview, index) => (
                    <div key={preview} className="relative">
                      <img
                        src={preview}
                        alt={`Upload preview ${index + 1}`}
                        className="h-20 w-20 border border-outline-variant/20 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImportFile(index)}
                        className="absolute -right-2 -top-2 border border-outline-variant/30 bg-surface px-1.5 py-0.5 font-label-sm uppercase text-error"
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={importApproved}
                onChange={(e) => setImportApproved(e.target.checked)}
                className="size-4"
              />
              <span className="text-label-sm text-on-surface">
                Publish immediately on the home page
              </span>
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={importing}
                className="bg-primary px-4 py-2 font-label-sm uppercase text-on-primary disabled:opacity-50"
              >
                {importing ? "Saving…" : "Import review"}
              </button>
              {importSuccess && (
                <p className="text-label-sm text-secondary">{importSuccess}</p>
              )}
            </div>
          </form>
        )}
      </section>

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
                  {isImportedReview(row) ? (
                    <>Etsy import · {row.approved ? "Approved" : "Pending"}</>
                  ) : (
                    <>
                      Order{" "}
                      <Link
                        to={`/admin/orders/${row.orderId}`}
                        className="text-primary hover:underline"
                      >
                        {row.orderId.slice(0, 8)}…
                      </Link>
                      {" · "}
                      {row.approved ? "Approved" : "Pending"}
                    </>
                  )}
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
            {reviewImagePaths(row).length > 0 && (
              <AdminReviewThumbnails paths={reviewImagePaths(row)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
