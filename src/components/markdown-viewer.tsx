"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type MarkdownViewerProps = {
  value: string | null | undefined;
  className?: string;
};

export function MarkdownViewer({ value, className }: MarkdownViewerProps) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {raw}
      </ReactMarkdown>
    </div>
  );
}

