import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RichTextEditor } from "@/components/RichTextEditor";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  clearLegacyProductDescriptionTemplate,
  readLegacyProductDescriptionTemplate,
} from "@/lib/productDescriptionTemplate";
import { isRichTextEmpty } from "@/lib/richTextUtils";
import {
  getProductDescriptionTemplate,
  saveProductDescriptionTemplate,
} from "@/services/catalogSettingsService";

export function ProductDescriptionTemplateEditor() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const client = await requireAdminSession(navigate);
      if (!client) {
        setLoading(false);
        return;
      }

      try {
        let html = await getProductDescriptionTemplate(client);

        if (isRichTextEmpty(html)) {
          const legacy = readLegacyProductDescriptionTemplate();
          if (!isRichTextEmpty(legacy)) {
            await saveProductDescriptionTemplate(client, legacy);
            clearLegacyProductDescriptionTemplate();
            html = legacy;
            setMessage("Template migrated from this browser to the database.");
          }
        }

        setTemplate(html);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load template",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [navigate]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }

    try {
      await saveProductDescriptionTemplate(client, template);
      setMessage("Template saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearTemplate() {
    if (
      !isRichTextEmpty(template) &&
      !window.confirm("Clear the product description template?")
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }

    try {
      await saveProductDescriptionTemplate(client, "");
      setTemplate("");
      clearLegacyProductDescriptionTemplate();
      setMessage("Template cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline-md text-on-surface">
            Product description template
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-on-surface-variant">
            Paste a reusable description once. When editing a product, use{" "}
            <strong className="text-on-surface">Load from template</strong> to
            copy it into that product&apos;s description field. Saved to the
            store database for all admins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => void handleSave()}
            className="bg-primary px-3 py-1.5 font-label-sm uppercase text-on-primary transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save template"}
          </button>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => void handleClearTemplate()}
            className="border border-outline-variant/30 px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:border-error hover:text-error disabled:opacity-50"
          >
            Clear template
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-body-sm text-on-surface-variant">Loading template…</p>
      ) : (
        <RichTextEditor value={template} onChange={setTemplate} />
      )}

      {error && <p className="mt-2 text-body-sm text-error">{error}</p>}
      {message && (
        <p className="mt-2 text-body-sm text-on-surface-variant" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
