"use client";

import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import type { TaskWithAssignee } from "@/types";
import { cn } from "@/lib/utils";
import { Paperclip } from "lucide-react";

type TaskCardProps = {
  task: TaskWithAssignee;
  onClick?: () => void;
  isDragging?: boolean;
  attachmentCount?: number;
  coverImageUrl?: string | null;
};

export function TaskCard({
  task,
  onClick,
  isDragging,
  attachmentCount = 0,
  coverImageUrl = null,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: task.id,
  });

  const assigneeName = (task as TaskWithAssignee).assignee?.name ?? null;
  const hasCover = Boolean(coverImageUrl);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "card cursor-grab active:cursor-grabbing text-left hover:bg-accent hover:ring-1 hover:ring-primary/20 transition-shadow overflow-hidden",
        isDragging && "opacity-50 shadow-none"
      )}
    >
      {hasCover && (
        <div className="relative w-full h-28 bg-muted shrink-0">
          <Image
            src={coverImageUrl!}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 16rem"
          />
        </div>
      )}
      <div className={cn("p-3", hasCover && "pt-2")}>
        <p className="font-medium text-sm">{task.title}</p>
        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground truncate">
            {assigneeName ?? "—"}
          </span>
          <div className="flex items-center gap-2">
            {attachmentCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title="จำนวนไฟล์แนบ">
                <Paperclip className="w-3.5 h-3.5" />
                {attachmentCount}
              </span>
            )}
            <span
              className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                task.priority === "urgent" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                task.priority === "high" && "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
                task.priority === "medium" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                task.priority === "low" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              {task.priority}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
