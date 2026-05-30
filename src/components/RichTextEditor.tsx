import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import {
  isRichTextEmpty,
  normalizeRichTextForSave,
  prepareRichTextForDisplay,
} from "@/lib/richTextUtils";

export { isRichTextEmpty, normalizeRichTextForSave };

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

function ColorInput({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <label
      title={title}
      className="flex cursor-pointer items-center gap-1 px-1 py-1 font-label-sm uppercase text-on-surface-variant hover:text-on-surface"
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 cursor-pointer border border-outline-variant/30 bg-surface-container-low"
      />
      <span>{title}</span>
    </label>
  );
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: prepareRichTextForDisplay(value || ""),
    editorProps: {
      attributes: {
        class:
          "rich-text-editor min-h-[160px] px-3 py-2 font-body-md text-on-surface focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const prepared = prepareRichTextForDisplay(value || "");
    const current = editor.getHTML();
    if (prepared !== current) {
      editor.commands.setContent(prepared || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-on-surface-variant">
        Loading editor…
      </div>
    );
  }

  const currentColor =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "#e8e0ec";
  const currentHighlight =
    (editor.getAttributes("highlight").color as string | undefined) ?? "#ff9d00";

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
        <ColorInput
          title="Color"
          value={currentColor}
          onChange={(color) => editor.chain().focus().setColor(color).run()}
        />
        <ColorInput
          title="Highlight"
          value={currentHighlight}
          onChange={(color) =>
            editor.chain().focus().toggleHighlight({ color }).run()
          }
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
      <EditorContent editor={editor} />
    </div>
  );
}
