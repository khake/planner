"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";

type WysiwygMarkdownEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
};

export function WysiwygMarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  compact = false,
}: WysiwygMarkdownEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    autofocus: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
      Markdown.configure({
        html: false,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none dark:prose-invert",
      },
    },
    onUpdate({ editor }) {
      const markdownStorage = editor.storage as unknown as {
        markdown: { getMarkdown: () => string };
      };
      const markdown = markdownStorage.markdown.getMarkdown();
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const markdownStorage = editor.storage as unknown as {
      markdown: { getMarkdown: () => string };
    };
    const current = markdownStorage.markdown.getMarkdown();
    if (current !== value) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) return null;

  const minHeight = compact ? 120 : 220;

  const buttonBase =
    "px-1.5 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors";

  const getButtonClass = (active: boolean) =>
    cn(
      buttonBase,
      active && "bg-primary/10 text-primary shadow-xs"
    );

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | null;
    // eslint-disable-next-line no-alert
    const url = window.prompt("ใส่ URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background flex flex-col overflow-hidden",
        disabled && "opacity-70 cursor-not-allowed",
        className
      )}
    >
      <div className="flex items-center gap-1 border-b bg-[#FFF7F2] px-2 py-1 text-xs">
        <button
          type="button"
          className={getButtonClass(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-semibold">B</span>
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("strike"))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("codeBlock"))}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"</>"}
        </button>
        <button
          type="button"
          className={getButtonClass(editor.isActive("link"))}
          onClick={setLink}
        >
          Link
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          รองรับ Markdown shortcuts เช่น **ตัวหนา**, - list, ~~strike~~
        </span>
      </div>

      <div className="px-3 py-2 text-sm" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

