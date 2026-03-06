"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";

type DraggableTaskProps = {
  task: Task;
  onClick?: (task: Task) => void;
};

export function DraggableTask({ task, onClick }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(task)}
      className={cn(
        "mb-2 cursor-grab rounded-md border border-[#E8E8E8] bg-card p-3 transition-colors hover:bg-accent active:cursor-grabbing",
        isDragging && "opacity-40 shadow-none"
      )}
    >
      <span className="block text-sm font-medium text-[#222222]">{task.title}</span>
      <span className="text-xs text-[#666666]">{task.priority}</span>
    </div>
  );
}
