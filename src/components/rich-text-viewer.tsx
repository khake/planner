import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isRichTextEmpty, sanitizeRichTextHtml } from "@/lib/rich-text";

type RichTextViewerProps = {
  html: string | null | undefined;
  className?: string;
  emptyFallback?: ReactNode;
};

export function RichTextViewer({
  html,
  className,
  emptyFallback = null,
}: RichTextViewerProps) {
  const safeHtml = sanitizeRichTextHtml(html);

  if (isRichTextEmpty(safeHtml)) {
    return <>{emptyFallback}</>;
  }

  return (
    <div
      className={cn("rich-text-content", className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
