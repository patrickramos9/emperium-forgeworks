import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StarRatingInput } from "@/components/ReviewCard";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { hasReviewModel } from "@/lib/dataModels";
import { listAllProducts, type ProductRecord } from "@/lib/listAllProducts";
import { isPrintServiceCatalogSlug } from "@/lib/printService";
import { resolveImageUrl } from "@/lib/productImageUrls";
import {
  MAX_REVIEW_IMAGES,
  uploadReviewImages,
} from "@/lib/reviewImageUpload";
import {
  compareReviewsByDate,
  createImportedReview,
  deleteReview,
  formatReviewDate,
  generateImportedReviewId,
  isImportedReview,
  listAllReviews,
  reviewDateInputToIso,
  reviewDateInputValue,
  reviewDisplayName,
  reviewEtsyUrl,
  reviewImagePaths,
  setReviewApproved,
  setReviewProductSlug,
  setReviewReviewedAt,
  setReviewSourceUrl,
  type ReviewRecord,
} from "@/services/reviewService";
import { ETSY_SHOP_REVIEWS_URL } from "@/lib/config";

type ProductOption = {
  slug: string;
  title: string;
};

function productOptionsFromCatalog(products: ProductRecord[]): ProductOption[] {
  return products
    .filter((row) => row.slug && !isPrintServiceCatalogSlug(row.slug))
    .map((row) => ({
      slug: row.slug,
      title: row.title.split("–")[0]?.trim() || row.title,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

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

function ProductAssignSelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: ProductOption[];
  disabled?: boolean;
  onChange: (slug: string) => void;
}) {
  const known = !value || options.some((opt) => opt.slug === value);

  return (
    <label className="block min-w-[14rem] flex-1">
      <span className="font-label-sm uppercase text-on-surface-variant">
        Product
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2 text-on-surface disabled:opacity-50"
      >
        <option value="">Home page only (no product)</option>
        {!known && value ? (
          <option value={value}>{value} (missing from catalog)</option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.slug} value={opt.slug}>
            {opt.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReviewDateEditor({
  initialValue,
  disabled,
  onSave,
}: {
  initialValue: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    setDraft(initialValue);
  }, [initialValue]);

  const dirty = draft !== initialValue;

  return (
    <div className="mt-3">
      <label className="block">
        <span className="font-label-sm uppercase text-on-surface-variant">
          Review date
        </span>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            type="date"
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            className="border border-outline-variant/30 bg-surface px-3 py-2 text-on-surface disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled || !dirty || !draft}
            onClick={() => onSave(draft)}
            className="border border-outline-variant/30 px-3 py-2 font-label-sm uppercase hover:border-primary disabled:opacity-50"
          >
            Save date
          </button>
        </div>
      </label>
    </div>
  );
}

function EtsySourceUrlEditor({
  initialUrl,
  disabled,
  onSave,
}: {
  initialUrl: string;
  disabled?: boolean;
  onSave: (url: string) => void;
}) {
  const [draft, setDraft] = useState(initialUrl);

  useEffect(() => {
    setDraft(initialUrl);
  }, [initialUrl]);

  const dirty = draft.trim() !== initialUrl.trim();

  return (
    <div className="mt-3">
      <label className="block">
        <span className="font-label-sm uppercase text-on-surface-variant">
          Etsy review link
        </span>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            type="url"
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={ETSY_SHOP_REVIEWS_URL}
            className="min-w-[16rem] flex-1 border border-outline-variant/30 bg-surface px-3 py-2 text-on-surface disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled || !dirty}
            onClick={() => onSave(draft)}
            className="border border-outline-variant/30 px-3 py-2 font-label-sm uppercase hover:border-primary disabled:opacity-50"
          >
            Save link
          </button>
        </div>
      </label>
      <p className="mt-1 text-label-sm text-on-surface-variant">
        Leave blank to use the{" "}
        <a
          href={ETSY_SHOP_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          shop reviews page
        </a>
        . Storefront always shows a View on Etsy link for imports.
      </p>
    </div>
  );
}

export function AdminReviewsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReviewRecord[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(true);
  const [importRating, setImportRating] = useState(5);
  const [importText, setImportText] = useState("");
  const [importDisplayName, setImportDisplayName] = useState("");
  const [importProductSlug, setImportProductSlug] = useState("");
  const [importSourceUrl, setImportSourceUrl] = useState("");
  const [importReviewedOn, setImportReviewedOn] = useState("");
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
      const [reviews, products] = await Promise.all([
        listAllReviews(client),
        listAllProducts(client),
      ]);
      setRows(reviews);
      setProductOptions(productOptionsFromCatalog(products));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const unassignedCount = useMemo(
    () => rows.filter((row) => !row.productSlug?.trim()).length,
    [rows],
  );

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

  async function handleAssignProduct(orderId: string, productSlug: string) {
    const client = await requireAdminSession(navigate);
    if (!client) return;

    setSavingId(orderId);
    setError(null);
    try {
      const updated = await setReviewProductSlug(
        client,
        orderId,
        productSlug || null,
      );
      setRows((prev) =>
        prev.map((row) => (row.orderId === orderId ? updated : row)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign product");
    }
    setSavingId(null);
  }

  async function handleSaveReviewedAt(orderId: string, dateValue: string) {
    const client = await requireAdminSession(navigate);
    if (!client) return;

    setSavingId(orderId);
    setError(null);
    try {
      const reviewedAt = reviewDateInputToIso(dateValue);
      const updated = await setReviewReviewedAt(client, orderId, reviewedAt);
      setRows((prev) =>
        prev
          .map((row) => (row.orderId === orderId ? updated : row))
          .sort(compareReviewsByDate),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save review date",
      );
    }
    setSavingId(null);
  }

  async function handleSaveSourceUrl(orderId: string, sourceUrl: string) {
    const client = await requireAdminSession(navigate);
    if (!client) return;

    setSavingId(orderId);
    setError(null);
    try {
      const updated = await setReviewSourceUrl(
        client,
        orderId,
        sourceUrl.trim() || null,
      );
      setRows((prev) =>
        prev.map((row) => (row.orderId === orderId ? updated : row)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save Etsy review link",
      );
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

      const linkedSlug = importProductSlug.trim();
      const created = await createImportedReview(client, {
        orderId,
        rating: importRating,
        text: importText,
        displayName: importDisplayName,
        approved: importApproved,
        images,
        productSlug: linkedSlug || undefined,
        sourceUrl: importSourceUrl.trim() || undefined,
        reviewedAt: reviewDateInputToIso(importReviewedOn) ?? undefined,
      });
      setRows((prev) => [created, ...prev].sort(compareReviewsByDate));
      setImportText("");
      setImportDisplayName("");
      setImportProductSlug("");
      setImportSourceUrl("");
      setImportReviewedOn("");
      setImportRating(5);
      setImportApproved(true);
      clearObjectUrls(importPreviews);
      setImportFiles([]);
      setImportPreviews([]);
      setImportSuccess(
        linkedSlug
          ? "Etsy review imported and linked to product."
          : "Etsy review imported.",
      );
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
        <strong>Voices From The Void</strong> on the home page and on product
        pages. Assign a product to show the review on that PDP and count toward
        its star rating. Copy Etsy reviews into the form below to publish them
        on your storefront.
        {pendingCount > 0 && (
          <span className="ml-2 text-secondary">
            {pendingCount} pending
          </span>
        )}
        {unassignedCount > 0 && (
          <span className="ml-2 text-on-surface-variant">
            {unassignedCount} without a product
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
              <ProductAssignSelect
                value={importProductSlug}
                options={productOptions}
                onChange={setImportProductSlug}
              />
              <p className="mt-1 text-label-sm text-on-surface-variant">
                Link this review to a catalog product so it appears on that
                product page.
              </p>
            </div>

            <label className="mt-4 block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Review date
              </span>
              <input
                type="date"
                value={importReviewedOn}
                onChange={(e) => setImportReviewedOn(e.target.value)}
                className="mt-1 border border-outline-variant/30 bg-surface px-3 py-2 text-on-surface"
              />
              <p className="mt-1 text-label-sm text-on-surface-variant">
                Use the original Etsy review date. Leave blank to use today.
              </p>
            </label>

            <label className="mt-4 block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Etsy review link (optional)
              </span>
              <input
                type="url"
                value={importSourceUrl}
                onChange={(e) => setImportSourceUrl(e.target.value)}
                placeholder={ETSY_SHOP_REVIEWS_URL}
                className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2 text-on-surface"
              />
              <p className="mt-1 text-label-sm text-on-surface-variant">
                Paste a listing or shop reviews URL if you have one. Leave blank
                to use the shop reviews page. Storefront cards always link Etsy
                imports back to Etsy.
              </p>
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
                Publish immediately on the storefront
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
                  {formatReviewDate(row) ? `${formatReviewDate(row)} · ` : ""}
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
            <div className="mt-4 border-t border-outline-variant/15 pt-3">
              <ReviewDateEditor
                initialValue={reviewDateInputValue(row)}
                disabled={savingId === row.orderId}
                onSave={(value) => void handleSaveReviewedAt(row.orderId, value)}
              />
              <ProductAssignSelect
                value={row.productSlug?.trim() ?? ""}
                options={productOptions}
                disabled={savingId === row.orderId}
                onChange={(slug) => void handleAssignProduct(row.orderId, slug)}
              />
              {row.productSlug?.trim() ? (
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  Shows on{" "}
                  <Link
                    to={`/shop/${row.productSlug.trim()}`}
                    className="text-primary hover:underline"
                  >
                    /shop/{row.productSlug.trim()}
                  </Link>
                  {row.approved ? "" : " once approved"}.
                </p>
              ) : (
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  Not linked to a product — home / reviews page only when
                  approved.
                </p>
              )}
              {isImportedReview(row) && (
                <>
                  <EtsySourceUrlEditor
                    initialUrl={row.sourceUrl?.trim() ?? ""}
                    disabled={savingId === row.orderId}
                    onSave={(url) => void handleSaveSourceUrl(row.orderId, url)}
                  />
                  {reviewEtsyUrl(row) && (
                    <p className="mt-1 text-label-sm text-on-surface-variant">
                      Storefront links to{" "}
                      <a
                        href={reviewEtsyUrl(row)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Etsy
                      </a>
                      .
                    </p>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
