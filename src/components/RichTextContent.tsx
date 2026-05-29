import DOMPurify from "dompurify";
import { isRichTextEmpty } from "@/components/RichTextEditor";

type RichTextContentProps = {
  html: string | null | undefined;
  className?: string;
};

/** Renders admin-authored HTML safely on the storefront. */
export function RichTextContent({ html, className = "" }: RichTextContentProps) {
  if (isRichTextEmpty(html)) return null;

  const clean = DOMPurify.sanitize(html ?? "", {
    USE_PROFILES: { html: true },
  });

  return (
    <div
      className={`rich-text-content font-body-lg text-on-surface-variant ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
