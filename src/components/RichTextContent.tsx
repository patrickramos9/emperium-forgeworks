import DOMPurify from "dompurify";
import {
  isRichTextEmpty,
  prepareRichTextForDisplay,
  RICH_TEXT_ALLOWED_ATTR,
  RICH_TEXT_ALLOWED_TAGS,
} from "@/lib/richTextUtils";

type RichTextContentProps = {
  html: string | null | undefined;
  className?: string;
};

/** Renders admin-authored HTML safely on the storefront. */
export function RichTextContent({ html, className = "" }: RichTextContentProps) {
  if (isRichTextEmpty(html)) return null;

  const prepared = prepareRichTextForDisplay(html ?? "");
  const clean = DOMPurify.sanitize(prepared, {
    ALLOWED_TAGS: [...RICH_TEXT_ALLOWED_TAGS],
    ALLOWED_ATTR: [...RICH_TEXT_ALLOWED_ATTR],
  });

  return (
    <div
      className={`rich-text-content font-body-lg text-on-surface-variant ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
