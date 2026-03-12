"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import Image from "next/image";
import type { TaskStatus, TaskWithAssignee } from "@/types";
import { cn } from "@/lib/utils";
import { Paperclip, ArrowUp, ArrowDown, Minus, User } from "lucide-react";
import { getTagClassName, getTaskTypeMeta } from "@/lib/task-ui";

type TaskCardProps = {
  task: TaskWithAssignee;
  onClick?: () => void;
  onDoubleClick?: () => void;
  isDragging?: boolean;
  attachmentCount?: number;
  coverImageUrl?: string | null;
  /** ชื่อ Epic (Squad หรือ Global) เมื่อ task ผูกกับ Epic */
  epicLabel?: string | null;
  /** ผู้ทดสอบ (QA) ของ task นี้ */
  qaAssigneeName?: string | null;
};

export function TaskCard({
  task,
  onClick,
  onDoubleClick,
  isDragging,
  attachmentCount = 0,
  coverImageUrl = null,
  epicLabel = null,
  qaAssigneeName = null,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
  });

  const assigneeName = (task as TaskWithAssignee).assignee?.name ?? null;
  const hasCover = Boolean(coverImageUrl);
  const typeMeta = getTaskTypeMeta(task.type);
  const TypeIcon = typeMeta.icon;

  const status = task.status as TaskStatus;

  const statusLabelMap: Record<TaskStatus, string> = {
    backlog: "Backlog",
    todo: "Todo",
    in_progress: "In Progress",
    ready_for_qa: "Ready for QA",
    qa_in_progress: "QA In Progress",
    review: "Review",
    done: "Done",
  };

  const statusClassName = (() => {
    switch (status) {
      case "todo":
      case "backlog":
        return "bg-gray-100 text-gray-700";
      case "in_progress":
        return "bg-sky-100 text-sky-700";
      case "ready_for_qa":
        return "bg-violet-100 text-violet-700";
      case "qa_in_progress":
        return "bg-orange-100 text-orange-700";
      case "done":
        return "bg-emerald-100 text-emerald-700";
      case "review":
      default:
        return "bg-slate-100 text-slate-700";
    }
  })();

  const renderPriorityBadge = () => {
    const base =
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium";
    if (task.priority === "urgent" || task.priority === "high") {
      return (
        <span className={cn(base, "bg-red-50 text-red-700")}>
          <ArrowUp className="h-3 w-3" />
          <span className="uppercase">{task.priority}</span>
        </span>
      );
    }
    if (task.priority === "medium") {
      return (
        <span className={cn(base, "bg-amber-50 text-amber-700")}>
          <Minus className="h-3 w-3" />
          <span className="capitalize">{task.priority}</span>
        </span>
      );
    }
    return (
      <span className={cn(base, "bg-sky-50 text-sky-700")}>
        <ArrowDown className="h-3 w-3" />
        <span className="capitalize">{task.priority}</span>
      </span>
    );
  };

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
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "card cursor-grab active:cursor-grabbing text-left hover:bg-accent hover:ring-1 hover:ring-primary/20 transition-shadow overflow-hidden",
        isDragging && "opacity-50 shadow-none",
        task.qa_status === "failed" &&
          "ring-1 ring-red-300 border border-red-200 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
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
      <div className={cn("p-3.5", hasCover && "pt-2.5")}>
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
        <p className="font-semibold text-sm text-[#222222]">{task.title}</p>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
              statusClassName
            )}
          >
            {statusLabelMap[status]}
          </span>
          {renderPriorityBadge()}
        </div>
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
        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate max-w-[60%]">
            {/* Dev */}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E0E0E0] text-[9px]">
                {assigneeName ? (
                  assigneeName.charAt(0).toUpperCase()
                ) : (
                  <User className="h-3.5 w-3.5 text-[#9E9E9E]" />
                )}
              </span>
              <span className="max-w-[4.5rem] truncate">
                {assigneeName ?? "ไม่ระบุ"}
              </span>
              <span className="ml-0.5 text-[9px] uppercase text-[#9E9E9E]">Dev</span>
            </span>
            {/* QA */}
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[9px]">
                {qaAssigneeName ? (
                  qaAssigneeName.charAt(0).toUpperCase()
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="max-w-[4.5rem] truncate">
                {qaAssigneeName ?? "ไม่ระบุ"}
              </span>
              <span className="ml-0.5 text-[9px] uppercase text-red-500/80">QA</span>
            </span>
          </div>
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
