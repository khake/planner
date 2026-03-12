"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { TaskStatus, TaskWithAssignee } from "@/types";
import { cn } from "@/lib/utils";
import { getTagClassName, getTaskTypeMeta } from "@/lib/task-ui";
import { ArrowDown, ArrowUp, GripVertical, Minus, User } from "lucide-react";

type DraggableTaskProps = {
  task: TaskWithAssignee;
  onClick?: (task: TaskWithAssignee) => void;
  onDoubleClick?: (task: TaskWithAssignee) => void;
  /** ชื่อ Epic เมื่อ task ผูกกับ Epic */
  epicLabel?: string | null;
  /** ผู้ทดสอบ (QA) ของ task นี้ */
  qaAssigneeName?: string | null;
  /** task เคยถูก QA ตีกลับหรือไม่ */
  isQaFailed?: boolean;
};

export function DraggableTask({
  task,
  onClick,
  onDoubleClick,
  epicLabel = null,
  qaAssigneeName = null,
  isQaFailed = false,
}: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: task.id,
  });
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
      onClick={() => onClick?.(task)}
      onDoubleClick={() => onDoubleClick?.(task)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "mb-2 cursor-pointer rounded-lg border border-[#E8E8E8] bg-card px-3.5 py-3 shadow-xs transition-colors hover:bg-accent/60 hover:border-primary/30 hover:shadow-sm",
        isDragging && "opacity-40 shadow-none",
        isQaFailed && "border-red-300 shadow-[0_0_0_1px_rgba(248,113,113,0.4)]"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-[#E0E0E0] text-[#BDBDBD] hover:text-[#757575] hover:border-[#BDBDBD] cursor-grab active:cursor-grabbing bg-white/80"
          aria-label="ลากเพื่อจัดลำดับ"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 min-w-0 text-[11px] text-[#666666]">
            {task.ticket_key && (
              <span className="font-mono truncate">
                {task.ticket_key}
              </span>
            )}
            {task.epic_id && (
              <span
                className="max-w-[9rem] truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-[#555555]"
                title={epicLabel ?? "Epic"}
              >
                {epicLabel ?? "Epic"}
              </span>
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="mt-0.5 block text-[13px] font-semibold leading-snug text-[#222222]">
              {task.title}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
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
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-[#777777] flex-wrap">
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-md",
            typeMeta.indicatorClassName
          )}
          title={typeMeta.label}
        >
          <TypeIcon className="h-3 w-3" />
        </span>
        {/* Dev assignee */}
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-medium text-[#555555]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E0E0E0] text-[9px]">
            {task.assignee?.name
              ? task.assignee.name.charAt(0).toUpperCase()
              : <User className="h-3 w-3 text-[#9E9E9E]" />}
          </span>
          <span className="max-w-[6rem] truncate">
            {task.assignee?.name ?? "ไม่ระบุ"}
          </span>
          <span className="ml-0.5 text-[9px] uppercase text-[#9E9E9E]">Dev</span>
        </span>

        {/* QA assignee */}
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[9px]">
            {qaAssigneeName
              ? qaAssigneeName.charAt(0).toUpperCase()
              : <User className="h-3 w-3" />}
          </span>
          <span className="max-w-[6rem] truncate">
            {qaAssigneeName ?? "ไม่ระบุ"}
          </span>
          <span className="ml-0.5 text-[9px] uppercase text-red-500/80">QA</span>
        </span>
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  getTagClassName(tag)
                )}
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="inline-flex rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-medium text-[#666666]">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
