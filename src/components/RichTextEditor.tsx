import { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import {
  isRichTextEmpty,
  normalizeRichTextForSave,
  preserveEmptyParagraphs,
  prepareRichTextForDisplay,
} from "@/lib/richTextUtils";

export { isRichTextEmpty, normalizeRichTextForSave };

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
};

const TEXT_COLOR_SWATCHES = [
  { label: "Primary", value: "#ffb694" },
  { label: "Secondary", value: "#e2b6ff" },
  { label: "Plasma", value: "#ff9d00" },
  { label: "Light", value: "#e5e2e1" },
  { label: "Muted", value: "#e2bfb0" },
] as const;

const DEFAULT_TEXT_COLOR = "#e5e2e1";

function toHexColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (value.startsWith("#")) {
    return value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value;
  }
  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const hex = [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
      .map((part) => Number(part).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  }
  return fallback;
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: string;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        "px-2 py-1 font-label-sm uppercase",
        active
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function TextColorControls({
  currentColor,
  onPickColor,
  onResetColor,
}: {
  currentColor: string;
  onPickColor: (color: string) => void;
  onResetColor: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 border-l border-outline-variant/20 pl-1"
      title="Select text, then choose a font color"
    >
      <span className="px-1 font-label-sm uppercase text-on-surface-variant">
        Text color
      </span>
      {TEXT_COLOR_SWATCHES.map((swatch) => (
        <button
          key={swatch.value}
          type="button"
          title={swatch.label}
          aria-label={`${swatch.label} text color`}
          onClick={() => onPickColor(swatch.value)}
          className={[
            "h-6 w-6 border",
            currentColor.toLowerCase() === swatch.value.toLowerCase()
              ? "border-primary ring-1 ring-primary"
              : "border-outline-variant/40",
          ].join(" ")}
          style={{ backgroundColor: swatch.value }}
        />
      ))}
      <label className="flex cursor-pointer items-center gap-1 px-1 font-label-sm uppercase text-on-surface-variant hover:text-on-surface">
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onPickColor(e.target.value)}
          className="h-6 w-8 cursor-pointer border border-outline-variant/30 bg-surface-container-low"
        />
        <span>Custom</span>
      </label>
      <button
        type="button"
        title="Reset to default text color"
        onClick={onResetColor}
        className="px-2 py-1 font-label-sm uppercase text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      >
        Reset
      </button>
    </div>
  );
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const lastEmittedHtml = useRef<string | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        hardBreak: {
          keepMarks: true,
        },
      }),
      Underline,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
    ],
    [],
  );

  const handleUpdate = useCallback(
    ({ editor: ed }: { editor: { getHTML: () => string } }) => {
      const html = preserveEmptyParagraphs(ed.getHTML());
      lastEmittedHtml.current = html;
      onChange(html);
    },
    [onChange],
  );

  const editor = useEditor({
    extensions,
    content: prepareRichTextForDisplay(value || ""),
    editorProps: {
      attributes: {
        class:
          "rich-text-editor min-h-[160px] px-3 py-2 font-body-md text-on-surface focus:outline-none",
      },
    },
    onUpdate: handleUpdate,
  });

  // Only sync when value changes externally (e.g. loading a record), not on each keystroke.
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedHtml.current) return;

    const prepared = prepareRichTextForDisplay(value || "");
    const current = preserveEmptyParagraphs(editor.getHTML());
    if (prepared !== current) {
      editor.commands.setContent(prepared || "", { emitUpdate: false });
      lastEmittedHtml.current = prepared || "";
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-on-surface-variant">
        Loading editor…
      </div>
    );
  }

  const currentColor = toHexColor(
    editor.getAttributes("textStyle").color as string | undefined,
    DEFAULT_TEXT_COLOR,
  );

  function applyTextColor(color: string) {
    editor.chain().focus().setColor(color).run();
  }

  function resetTextColor() {
    editor.chain().focus().unsetColor().run();
  }

  return (
    <div className="border border-outline-variant/30 bg-surface-container-low">
      <div className="flex flex-wrap gap-1 border-b border-outline-variant/20 p-1">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </ToolbarButton>
        <ToolbarButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          title="Block quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </ToolbarButton>
        <TextColorControls
          currentColor={currentColor}
          onPickColor={applyTextColor}
          onResetColor={resetTextColor}
        />
        <ToolbarButton
          title="Clear formatting"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        >
          Clear
        </ToolbarButton>
      </div>
      <div className="rich-text-editor-scroll max-h-[min(50vh,420px)] overflow-y-auto overscroll-contain">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
