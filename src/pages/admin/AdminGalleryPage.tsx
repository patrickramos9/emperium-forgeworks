import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageFeedback } from "@/components/PageFeedback";
import { ConfirmDeleteActions } from "@/components/admin/ConfirmDeleteActions";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { hasGalleryEntryModel } from "@/lib/dataModels";
import { uploadGalleryImage } from "@/lib/galleryImageUpload";
import { listAllProducts, type ProductRecord } from "@/lib/listAllProducts";
import { isPrintServiceCatalogSlug } from "@/lib/printService";
import {
  createGalleryEntry,
  deleteGalleryEntry,
  formatGalleryReceivedDate,
  galleryReceivedAtFromDateInput,
  galleryReceivedDateInputValue,
  listAllGalleryEntries,
  updateGalleryEntry,
  type GalleryEntryRecord,
} from "@/services/galleryService";

type FormState = {
  artistName: string;
  artistUrl: string;
  productSlug: string;
  receivedDate: string;
  active: boolean;
  sortOrder: string;
  imageFile: File | null;
};

const emptyForm = (): FormState => ({
  artistName: "",
  artistUrl: "",
  productSlug: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  active: true,
  sortOrder: "0",
  imageFile: null,
});

function productOptionsFromCatalog(products: ProductRecord[]): ProductRecord[] {
  return [...products]
    .filter((p) => Boolean(p.slug?.trim()) && !isPrintServiceCatalogSlug(p.slug))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function AdminGalleryPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<GalleryEntryRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const productOptions = useMemo(
    () => productOptionsFromCatalog(products),
    [products],
  );

  const titleBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.slug, p.title);
    return map;
  }, [products]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = await requireAdminSession(navigate);
    if (!client) {
      setLoading(false);
      return;
    }

    // Products must load even when GalleryEntry is not deployed yet.
    try {
      setProducts(await listAllProducts(client));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
      setLoading(false);
      return;
    }

    if (!hasGalleryEntryModel(client)) {
      setError(
        "Gallery API is not deployed. Push backend changes and redeploy Amplify. Product list is available for when it is.",
      );
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setRows(await listAllGalleryEntries(client));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gallery.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: GalleryEntryRecord) {
    setEditingId(row.id);
    setForm({
      artistName: row.artistName,
      artistUrl: row.artistUrl ?? "",
      productSlug: row.productSlug,
      receivedDate: galleryReceivedDateInputValue(row.receivedAt),
      active: row.active,
      sortOrder: String(row.sortOrder),
      imageFile: null,
    });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setMessage(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;

      const receivedAt = galleryReceivedAtFromDateInput(form.receivedDate);
      const sortOrder = Number.parseInt(form.sortOrder, 10) || 0;

      if (editingId) {
        let imagePath: string | undefined;
        if (form.imageFile) {
          imagePath = await uploadGalleryImage(form.imageFile);
        }
        await updateGalleryEntry(client, editingId, {
          ...(imagePath ? { imagePath } : {}),
          artistName: form.artistName,
          artistUrl: form.artistUrl || null,
          productSlug: form.productSlug,
          receivedAt,
          active: form.active,
          sortOrder,
        });
        setMessage("Gallery entry updated.");
      } else {
        if (!form.imageFile) {
          throw new Error("Choose an image to upload.");
        }
        const imagePath = await uploadGalleryImage(form.imageFile);
        await createGalleryEntry(client, {
          imagePath,
          artistName: form.artistName,
          artistUrl: form.artistUrl || null,
          productSlug: form.productSlug,
          receivedAt,
          active: form.active,
          sortOrder,
        });
        setMessage("Gallery entry created.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setMessage(null);
    setDeleting(true);
    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      await deleteGalleryEntry(client, id);
      if (editingId === id) resetForm();
      setPendingDeleteId(null);
      setMessage("Gallery entry deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete entry.");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(row: GalleryEntryRecord) {
    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      await updateGalleryEntry(client, row.id, { active: !row.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update entry.");
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading gallery…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase text-on-surface">
            Gallery
          </h1>
          <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
            Customer-painted photos for{" "}
            <Link to="/gallery" className="text-primary hover:underline">
              /gallery
            </Link>
            . Include the Etsy account name, catalog product, and when you
            received the picture. Optionally link the name to their shop or
            portfolio.
          </p>
        </div>
      </div>

      {error ? <PageFeedback tone="error" className="mt-4">{error}</PageFeedback> : null}
      {message ? (
        <PageFeedback tone="success" className="mt-4">
          {message}
        </PageFeedback>
      ) : null}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-stack-lg max-w-2xl space-y-4 border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel"
      >
        <h2 className="font-label-md uppercase text-on-surface">
          {editingId ? "Edit entry" : "Add entry"}
        </h2>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Photo {editingId ? "(optional — leave blank to keep current)" : ""}
          </span>
          <input
            type="file"
            accept="image/*"
            required={!editingId}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                imageFile: e.target.files?.[0] ?? null,
              }))
            }
            className="mt-1 block w-full text-body-sm text-on-surface"
          />
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Etsy / artist account name
          </span>
          <input
            required
            value={form.artistName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, artistName: e.target.value }))
            }
            className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Artist link (optional)
          </span>
          <input
            type="url"
            placeholder="https://www.etsy.com/shop/…"
            value={form.artistUrl}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, artistUrl: e.target.value }))
            }
            className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
          />
          <span className="mt-1 block text-body-sm text-on-surface-variant">
            When set, the account name becomes a hyperlink on the gallery page.
          </span>
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Catalog product painted
          </span>
          <select
            required
            value={form.productSlug}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, productSlug: e.target.value }))
            }
            className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
          >
            <option value="">
              {productOptions.length === 0
                ? "No products found"
                : "Select a product…"}
            </option>
            {productOptions.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
          {productOptions.length === 0 ? (
            <span className="mt-1 block text-body-sm text-on-surface-variant">
              No catalog products loaded. Confirm Admin → Products has items and
              you are signed in as admin.
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Date photo received
          </span>
          <input
            type="date"
            required
            value={form.receivedDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, receivedDate: e.target.value }))
            }
            className="mt-1 w-full max-w-xs border border-outline-variant/30 bg-surface px-3 py-2"
          />
        </label>

        <label className="block max-w-xs">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Sort order (lower first)
          </span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
            }
            className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, active: e.target.checked }))
            }
          />
          <span className="font-label-md text-on-surface">
            Active (show on /gallery)
          </span>
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="border border-primary bg-primary px-4 py-2 font-label-sm uppercase text-on-primary disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Add to gallery"}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="border border-outline-variant/40 bg-surface px-4 py-2 font-label-sm uppercase text-on-surface disabled:opacity-60"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-stack-lg overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-body-sm">
          <thead>
            <tr className="border-b border-outline-variant/30 font-label-sm uppercase text-on-surface-variant">
              <th className="py-2 pr-3">Photo</th>
              <th className="py-2 pr-3">Artist</th>
              <th className="py-2 pr-3">Product</th>
              <th className="py-2 pr-3">Received</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-on-surface-variant">
                  No gallery entries yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-outline-variant/15 align-top"
                >
                  <td className="py-3 pr-3">
                    {row.imageUrl ? (
                      <img
                        src={row.imageUrl}
                        alt=""
                        className="h-16 w-16 object-cover"
                      />
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="text-on-surface">{row.artistName}</div>
                    {row.artistUrl ? (
                      <a
                        href={row.artistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline"
                      >
                        Link
                      </a>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3">
                    <Link
                      to={`/shop/${row.productSlug}`}
                      className="text-primary hover:underline"
                    >
                      {titleBySlug.get(row.productSlug) ?? row.productSlug}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-on-surface-variant">
                    {formatGalleryReceivedDate(row.receivedAt)}
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => void toggleActive(row)}
                      className="font-label-sm uppercase text-primary hover:underline"
                    >
                      {row.active ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-left font-label-sm uppercase text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <ConfirmDeleteActions
                        itemLabel={row.artistName}
                        pending={pendingDeleteId === row.id}
                        busy={deleting && pendingDeleteId === row.id}
                        onBegin={() => setPendingDeleteId(row.id)}
                        onCancel={() => setPendingDeleteId(null)}
                        onConfirm={() => void handleDelete(row.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
