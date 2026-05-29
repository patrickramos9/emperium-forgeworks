import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
};

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

export function RichTextEditor({
  value,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] px-3 py-2 font-body-md text-on-surface focus:outline-none [&_h2]:font-headline-md [&_h2]:text-on-surface [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-on-surface-variant">
        Loading editor…
      </div>
    );
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
          title="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/** True when TipTap/Quill output is empty (e.g. `<p></p>`). */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html?.trim()) return true;
  const text = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return text.length === 0;
}

export function normalizeRichTextForSave(html: string): string | undefined {
  return isRichTextEmpty(html) ? undefined : html.trim();
}
