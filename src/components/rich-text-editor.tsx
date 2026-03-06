"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeRichTextHtml } from "@/lib/rich-text";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  compact?: boolean;
  fullHeight?: boolean;
  disabled?: boolean;
  loading?: boolean;
  submitting?: boolean;
  onModEnter?: () => void;
};

type ToolbarButtonProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolbarButton({
  label,
  icon: Icon,
  isActive = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      className={cn("h-8 px-2.5", isActive && "bg-primary/10 text-primary hover:bg-primary/15")}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function getBlockType(editor: Editor | null) {
  if (!editor) {
    return "paragraph";
  }

  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "paragraph";
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "พิมพ์ข้อความ...",
  className,
  contentClassName,
  compact = false,
  fullHeight = false,
  disabled = false,
  loading = false,
  submitting = false,
  onModEnter,
}: RichTextEditorProps) {
  const normalizedValue = useMemo(() => sanitizeRichTextHtml(value), [value]);
  const isReadOnly = disabled || loading || submitting;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isReadOnly,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: normalizedValue,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap rich-text-content px-3 py-2 text-sm focus:outline-none",
          fullHeight && "h-full",
          compact ? "min-h-[96px]" : "min-h-[240px]",
          isReadOnly && "cursor-not-allowed opacity-70"
        ),
      },
      handleKeyDown: (_, event) => {
        if (onModEnter && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onModEnter();
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentHtml = editor.isEmpty ? "" : sanitizeRichTextHtml(editor.getHTML());
    if (currentHtml === normalizedValue) {
      return;
    }

    editor.commands.setContent(normalizedValue, { emitUpdate: false });
  }, [editor, normalizedValue]);

  const activeBlockType = getBlockType(editor);

  const handleSetLink = () => {
    if (!editor) {
      return;
    }

    const previousHref = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("ใส่ URL ของลิงก์", previousHref ?? "https://");

    if (input === null) {
      return;
    }

    const href = input.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const normalizedHref = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href) ? href : `https://${href}`;

    editor.chain().focus().extendMarkRange("link").setLink({ href: normalizedHref }).run();
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background",
        fullHeight && "flex h-full flex-col",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-2",
          compact && "px-1.5 py-1.5"
        )}
      >
        <ToolbarButton
          label="ตัวหนา"
          icon={Bold}
          isActive={editor?.isActive("bold")}
          disabled={!editor || isReadOnly}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="ตัวเอียง"
          icon={Italic}
          isActive={editor?.isActive("italic")}
          disabled={!editor || isReadOnly}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="ขีดเส้นใต้"
          icon={UnderlineIcon}
          isActive={editor?.isActive("underline")}
          disabled={!editor || isReadOnly}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        />
        <div className="mx-1 h-6 w-px bg-border" />
        <ToolbarButton
          label="Bullet list"
          icon={List}
          isActive={editor?.isActive("bulletList")}
          disabled={!editor || isReadOnly}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Ordered list"
          icon={ListOrdered}
          isActive={editor?.isActive("orderedList")}
          disabled={!editor || isReadOnly}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Blockquote"
          icon={Quote}
          isActive={editor?.isActive("blockquote")}
          disabled={!editor || isReadOnly}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          label="Code block"
          icon={Code2}
          isActive={editor?.isActive("codeBlock")}
          disabled={!editor || isReadOnly}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          label="ลิงก์"
          icon={LinkIcon}
          isActive={editor?.isActive("link")}
          disabled={!editor || isReadOnly}
          onClick={handleSetLink}
        />
        <div className="mx-1 h-6 w-px bg-border" />
        <div className="flex items-center gap-1">
          <ToolbarButton
            label="ย่อหน้า"
            icon={Pilcrow}
            isActive={activeBlockType === "paragraph"}
            disabled={!editor || isReadOnly}
            onClick={() => editor?.chain().focus().setParagraph().run()}
          />
          <ToolbarButton
            label="Heading 1"
            icon={Heading1}
            isActive={activeBlockType === "h1"}
            disabled={!editor || isReadOnly}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          />
          <ToolbarButton
            label="Heading 2"
            icon={Heading2}
            isActive={activeBlockType === "h2"}
            disabled={!editor || isReadOnly}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="Heading 3"
            icon={Heading3}
            isActive={activeBlockType === "h3"}
            disabled={!editor || isReadOnly}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          />
        </div>
        {(loading || submitting) && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            {loading ? "กำลังโหลด..." : "กำลังบันทึก..."}
          </span>
        )}
      </div>
      <EditorContent
        editor={editor}
        className={cn(fullHeight && "flex-1 overflow-y-auto", contentClassName)}
      />
      {onModEnter && (
        <div className="border-t bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
          ใช้ <kbd className="rounded border bg-background px-1 py-0.5">Cmd/Ctrl + Enter</kbd> เพื่อส่ง
        </div>
      )}
    </div>
  );
}
