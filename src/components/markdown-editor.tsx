"use client";

import { useCallback, useRef, useState, type Ref } from "react";
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

type TabMode = "write" | "preview" | "split";

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
  const [tab, setTab] = useState<TabMode>("write");
  const minHeight = compact ? 140 : 220;
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      internalRef.current = el;
      if (!textareaRef) return;
      if (typeof textareaRef === "function") {
        textareaRef(el);
      } else {
        // MutableRefObject case
        (textareaRef as { current: HTMLTextAreaElement | null }).current = el;
      }
    },
    [textareaRef]
  );

  const applyWrap = (prefix: string, suffix?: string) => {
    const target = internalRef.current;
    if (!target || isReadOnly) return;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const tail = suffix ?? prefix;
    const next = `${before}${prefix}${selected}${tail}${after}`;
    onChange(next);
    const cursor = start + prefix.length + selected.length;
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(cursor, cursor);
    });
  };

  const applyLinePrefix = (prefix: string) => {
    const target = internalRef.current;
    if (!target || isReadOnly) return;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const lines = selected.split("\n");
    const prefixed = lines.map((line) => (line ? `${prefix}${line}` : prefix.trimEnd())).join("\n");
    const next = `${before}${prefixed}${after}`;
    onChange(next);
    const cursor = start + prefixed.length;
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(cursor, cursor);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      onModEnter &&
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      onModEnter();
    }
  };

  const renderTextarea = (extraClass?: string) => (
    <textarea
      ref={setRefs}
      className={cn(
        "w-full resize-none border-0 bg-background px-3 py-2 text-sm leading-relaxed outline-none font-mono",
        isReadOnly && "cursor-not-allowed opacity-70",
        extraClass
      )}
      style={{ minHeight }}
      value={value}
      placeholder={placeholder}
      disabled={isReadOnly}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );

  const renderPreview = (extraClass?: string) => (
    <div className={cn("px-3 py-2 text-sm", extraClass)} style={{ minHeight }}>
      <MarkdownViewer
        value={value || (placeholder ? `_${placeholder}_` : "")}
        className="text-sm"
      />
    </div>
  );

  const toolbarButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-primary/5 hover:text-primary",
        isReadOnly && "cursor-not-allowed opacity-60"
      )}
      onClick={() => {
        if (!isReadOnly) onClick();
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background flex flex-col",
        className
      )}
    >
      <div className="flex items-center border-b bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground gap-1 flex-wrap">
        {/* Tabs */}
        <div className="inline-flex rounded-md bg-background/40 p-0.5">
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
              "rounded px-2 py-0.5",
              tab === "preview" && "bg-background text-foreground shadow-sm"
            )}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
          <button
            type="button"
            className={cn(
              "rounded px-2 py-0.5",
              tab === "split" && "bg-background text-foreground shadow-sm"
            )}
            onClick={() => setTab("split")}
          >
            Split
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 border-l pl-2 ml-1">
          {toolbarButton("B", () => applyWrap("**"))}
          {toolbarButton("I", () => applyWrap("_"))}
          {toolbarButton("S", () => applyWrap("~~"))}
          {toolbarButton("`code`", () => applyWrap("`"))}
          {toolbarButton("H2", () => applyLinePrefix("## "))}
          {toolbarButton("List", () => applyLinePrefix("- "))}
          {toolbarButton("1.", () => applyLinePrefix("1. "))}
          {toolbarButton("Quote", () => applyLinePrefix("> "))}
          {toolbarButton("Link", () => applyWrap("[", "]()"))}
        </div>

        <span className="ml-auto text-[11px] text-muted-foreground">
          ใช้ Markdown · Ctrl/Cmd+Enter เพื่อบันทึก/ส่ง
        </span>
      </div>

      {tab === "write" && renderTextarea()}
      {tab === "preview" && renderPreview()}
      {tab === "split" && (
        <div className="flex flex-col border-t md:flex-row">
          <div className="md:w-1/2 md:border-r border-border/60">{renderTextarea()}</div>
          <div className="md:w-1/2 bg-muted/20">{renderPreview()}</div>
        </div>
      )}
    </div>
  );
}

