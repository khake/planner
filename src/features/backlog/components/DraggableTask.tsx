"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { TaskWithAssignee } from "@/types";
import { cn } from "@/lib/utils";
import { getTagClassName, getTaskTypeMeta } from "@/lib/task-ui";

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
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(task)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "mb-2 cursor-grab rounded-md border border-[#E8E8E8] bg-card p-3 transition-colors hover:bg-accent active:cursor-grabbing",
        isDragging && "opacity-40 shadow-none"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md",
            typeMeta.indicatorClassName
          )}
          title={typeMeta.label}
        >
          <TypeIcon className="h-3.5 w-3.5" />
        </span>
        <div className="flex items-center gap-2 min-w-0">
          {task.ticket_key && (
            <span className="text-[11px] font-mono text-[#666666] truncate">{task.ticket_key}</span>
          )}
          {task.epic_id && (
            <span className="text-[11px] text-[#666666] truncate max-w-[7rem]" title={epicLabel ?? "Epic"}>
              {epicLabel ?? "Epic"}
            </span>
          )}
          <span className="text-xs text-[#666666] shrink-0">{task.priority}</span>
        </div>
      </div>
      <span className="block text-sm font-medium text-[#222222]">{task.title}</span>
      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.tags.slice(0, 2).map((tag) => (
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
          {task.tags.length > 2 && (
            <span className="inline-flex rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-[#666666]">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
