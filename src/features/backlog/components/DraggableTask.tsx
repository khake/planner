"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { TaskWithAssignee } from "@/types";
import { cn } from "@/lib/utils";
import { getTagClassName, getTaskTypeMeta } from "@/lib/task-ui";
import { GripVertical } from "lucide-react";

type DraggableTaskProps = {
  task: TaskWithAssignee;
  onClick?: (task: TaskWithAssignee) => void;
  /** ชื่อ Epic เมื่อ task ผูกกับ Epic */
  epicLabel?: string | null;
};

export function DraggableTask({ task, onClick, epicLabel = null }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: task.id,
  });
  const typeMeta = getTaskTypeMeta(task.type);
  const TypeIcon = typeMeta.icon;

  return (
    <div
      ref={setNodeRef}
      onClick={() => onClick?.(task)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "mb-2 cursor-pointer rounded-md border border-[#E8E8E8] bg-card px-2.5 py-2 transition-colors hover:bg-accent",
        isDragging && "opacity-40 shadow-none"
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <button
          type="button"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-[#E0E0E0] text-[#BDBDBD] hover:text-[#757575] hover:border-[#BDBDBD] cursor-grab active:cursor-grabbing"
          aria-label="ลากเพื่อจัดลำดับ"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {task.ticket_key && (
              <span className="text-[11px] font-mono text-[#666666] truncate">
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
          <span className="mt-0.5 block text-[13px] font-medium leading-snug text-[#222222]">
            {task.title}
          </span>
        </div>
        <span className="ml-2 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-[#666666]">
          {task.priority}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-[#777777]">
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-md",
            typeMeta.indicatorClassName
          )}
          title={typeMeta.label}
        >
          <TypeIcon className="h-3 w-3" />
        </span>
        {task.assignee && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-medium text-[#555555]">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E0E0E0] text-[9px]">
              {task.assignee.name.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[6rem] truncate">{task.assignee.name}</span>
          </span>
        )}
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
