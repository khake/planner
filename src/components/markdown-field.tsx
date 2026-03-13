"use client";

import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownViewer } from "@/components/markdown-viewer";

type MarkdownFieldProps = {
  value: string;
  onChange?: (value: string) => void;
  editable: boolean;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  onModEnter?: () => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
};

export function MarkdownField({
  value,
  onChange,
  editable,
  placeholder,
  className,
  compact,
  disabled,
  submitting,
  onModEnter,
  textareaRef,
}: MarkdownFieldProps) {
  if (editable && onChange) {
    return (
      <MarkdownEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        compact={compact}
        disabled={disabled}
        submitting={submitting}
        onModEnter={onModEnter}
        textareaRef={textareaRef}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-dashed bg-card/40 px-3 py-2 text-sm",
        className
      )}
    >
      <MarkdownViewer
        value={value || (placeholder ? `_${placeholder}_` : "")}
        className="text-sm leading-relaxed"
      />
    </div>
  );
}

