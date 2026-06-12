import { Link } from "react-router-dom";
import { isRichTextEmpty } from "@/lib/richTextUtils";
import {
  readProductDescriptionTemplate,
  writeProductDescriptionTemplate,
} from "@/lib/productDescriptionTemplate";

type LoadProductDescriptionTemplateProps = {
  currentDescription: string;
  onLoad: (html: string) => void;
};

export function LoadProductDescriptionTemplate({
  currentDescription,
  onLoad,
}: LoadProductDescriptionTemplateProps) {
  function handleLoad() {
    const template = readProductDescriptionTemplate();
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
  }

  function handleSaveAsTemplate() {
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

    writeProductDescriptionTemplate(currentDescription);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleLoad}
        className="border border-outline-variant/30 bg-surface-container-high px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      >
        Load from template
      </button>
      <button
        type="button"
        onClick={handleSaveAsTemplate}
        className="border border-outline-variant/30 bg-surface-container-high px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      >
        Save description as template
      </button>
      <Link
        to="/admin/products"
        className="font-label-sm uppercase text-primary hover:underline"
      >
        Edit template on Products
      </Link>
    </div>
  );
}
