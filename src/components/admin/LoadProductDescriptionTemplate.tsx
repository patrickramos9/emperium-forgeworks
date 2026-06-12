import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { isRichTextEmpty } from "@/lib/richTextUtils";
import {
  getProductDescriptionTemplate,
  saveProductDescriptionTemplate,
} from "@/services/catalogSettingsService";

type LoadProductDescriptionTemplateProps = {
  currentDescription: string;
  onLoad: (html: string) => void;
};

export function LoadProductDescriptionTemplate({
  currentDescription,
  onLoad,
}: LoadProductDescriptionTemplateProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLoad() {
    setBusy(true);
    setMessage(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setBusy(false);
      return;
    }

    try {
      const template = await getProductDescriptionTemplate(client);
      if (isRichTextEmpty(template)) {
        window.alert(
          "No description template saved yet. Add one on Admin → Products first.",
        );
        return;
      }

      if (
        !isRichTextEmpty(currentDescription) &&
        !window.confirm(
          "Replace the current product description with the template?",
        )
      ) {
        return;
      }

      onLoad(template);
      setMessage("Template loaded into this product.");
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not load template",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAsTemplate() {
    if (isRichTextEmpty(currentDescription)) {
      window.alert("The product description is empty — nothing to save.");
      return;
    }

    if (
      !window.confirm(
        "Replace the shared description template with this product's description?",
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setBusy(false);
      return;
    }

    try {
      await saveProductDescriptionTemplate(client, currentDescription);
      setMessage("Description saved as the shared template.");
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not save template",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleLoad()}
          className="border border-outline-variant/30 bg-surface-container-high px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {busy ? "Loading…" : "Load from template"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSaveAsTemplate()}
          className="border border-outline-variant/30 bg-surface-container-high px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save description as template"}
        </button>
        <Link
          to="/admin/products"
          className="font-label-sm uppercase text-primary hover:underline"
        >
          Edit template on Products
        </Link>
      </div>
      {message && (
        <p className="mt-2 text-body-sm text-on-surface-variant" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
