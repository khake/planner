"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";

type DraggableTaskProps = {
  task: Task;
};

export function DraggableTask({ task }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-md border bg-background p-3 mb-2 cursor-grab active:cursor-grabbing shadow-sm transition-shadow",
        isDragging && "opacity-40 shadow-none"
      )}
    >
      <span className="font-medium text-sm block">{task.title}</span>
      <span className="text-xs text-muted-foreground">{task.priority}</span>
    </div>
  );
}
