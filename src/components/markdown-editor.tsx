"use client";

import { useState, type Ref } from "react";
import { cn } from "@/lib/utils";
import { MarkdownViewer } from "@/components/markdown-viewer";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  onModEnter?: () => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
  compact = false,
  disabled = false,
  submitting = false,
  onModEnter,
  textareaRef,
}: MarkdownEditorProps) {
  const isReadOnly = disabled || submitting;
  const [tab, setTab] = useState<"write" | "preview">("write");
  const minHeight = compact ? 140 : 220;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background flex flex-col",
        className
      )}
    >
      <div className="flex items-center border-b bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground">
        <button
          type="button"
          className={cn(
            "rounded px-2 py-0.5",
            tab === "write" && "bg-background text-foreground shadow-sm"
          )}
          onClick={() => setTab("write")}
        >
          Write
        </button>
        <button
          type="button"
          className={cn(
            "ml-1 rounded px-2 py-0.5",
            tab === "preview" && "bg-background text-foreground shadow-sm"
          )}
          onClick={() => setTab("preview")}
        >
          Preview
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          ใช้ Markdown · Ctrl/Cmd+Enter เพื่อบันทึก/ส่ง
        </span>
      </div>

      {tab === "write" ? (
        <textarea
          ref={textareaRef}
          className={cn(
            "w-full resize-none border-0 bg-background px-3 py-2 text-sm leading-relaxed outline-none",
            "font-mono",
            isReadOnly && "cursor-not-allowed opacity-70"
          )}
          style={{ minHeight }}
          value={value}
          placeholder={placeholder}
          disabled={isReadOnly}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(event) => {
            if (
              onModEnter &&
              event.key === "Enter" &&
              (event.metaKey || event.ctrlKey)
            ) {
              event.preventDefault();
              onModEnter();
            }
          }}
        />
      ) : (
        <div className="px-3 py-2 text-sm" style={{ minHeight }}>
          <MarkdownViewer
            value={value || (placeholder ? `_${placeholder}_` : "")}
            className="text-sm"
          />
        </div>
      )}
    </div>
  );
}

