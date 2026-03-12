"use client";

import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { WysiwygMarkdownEditor } from "@/components/wysiwyg-markdown-editor";

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
}: MarkdownFieldProps) {
  if (editable && onChange) {
    return (
      <WysiwygMarkdownEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        compact={compact}
        disabled={disabled || submitting}
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

