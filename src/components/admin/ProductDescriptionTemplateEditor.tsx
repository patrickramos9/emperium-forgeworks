import { useEffect, useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  readProductDescriptionTemplate,
  writeProductDescriptionTemplate,
} from "@/lib/productDescriptionTemplate";
import { isRichTextEmpty } from "@/lib/richTextUtils";

export function ProductDescriptionTemplateEditor() {
  const [template, setTemplate] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTemplate(readProductDescriptionTemplate());
  }, []);

  function persistTemplate(html: string) {
    setTemplate(html);
    writeProductDescriptionTemplate(html);
    setMessage("Template saved in this browser.");
  }

  function handleClearTemplate() {
    if (
      !isRichTextEmpty(template) &&
      !window.confirm("Clear the product description template?")
    ) {
      return;
    }

    setTemplate("");
    writeProductDescriptionTemplate("");
    setMessage("Template cleared.");
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
            copy it into that product&apos;s description field.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClearTemplate}
          className="border border-outline-variant/30 px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:border-error hover:text-error"
        >
          Clear template
        </button>
      </div>

      <RichTextEditor value={template} onChange={persistTemplate} />

      {message && (
        <p className="mt-2 text-body-sm text-on-surface-variant" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
