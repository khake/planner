"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import Image from "next/image";
import type { TaskWithAssignee } from "@/types";
import { cn } from "@/lib/utils";
import { Paperclip } from "lucide-react";
import { getTagClassName, getTaskTypeMeta } from "@/lib/task-ui";

type TaskCardProps = {
  task: TaskWithAssignee;
  onClick?: () => void;
  isDragging?: boolean;
  attachmentCount?: number;
  coverImageUrl?: string | null;
  /** ชื่อ Epic (Squad หรือ Global) เมื่อ task ผูกกับ Epic */
  epicLabel?: string | null;
};

export function TaskCard({
  task,
  onClick,
  isDragging,
  attachmentCount = 0,
  coverImageUrl = null,
  epicLabel = null,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
  });

  const assigneeName = (task as TaskWithAssignee).assignee?.name ?? null;
  const hasCover = Boolean(coverImageUrl);
  const typeMeta = getTaskTypeMeta(task.type);
  const TypeIcon = typeMeta.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
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
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md",
              typeMeta.indicatorClassName
            )}
            title={typeMeta.label}
          >
            <TypeIcon className="h-4 w-4" />
          </span>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
              typeMeta.badgeClassName
            )}
          >
            {typeMeta.label}
          </span>
          {task.ticket_key && (
            <span className="text-[11px] font-mono text-muted-foreground">{task.ticket_key}</span>
          )}
          {task.epic_id && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[8rem]" title={epicLabel ?? "Epic"}>
              {epicLabel ?? "Epic"}
            </span>
          )}
        </div>
        <p className="font-medium text-sm">{task.title}</p>
        {task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  getTagClassName(tag)
                )}
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="inline-flex rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-[#666666]">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}
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
