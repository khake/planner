"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type DroppableSprintProps = {
  id: string;
  isBacklog: boolean;
  children?: React.ReactNode;
};

export function DroppableSprint({ id, isBacklog, children }: DroppableSprintProps) {
  const droppableId = isBacklog ? "backlog" : `sprint-${id}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { sprintId: isBacklog ? null : id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[160px] rounded-lg border-2 border-dashed transition-all duration-200",
        isOver
          ? "border-primary bg-primary/10 shadow-inner"
          : "border-transparent border-muted/50"
      )}
    >
      {isOver && (
        <div className="rounded-md border-2 border-dashed border-primary/50 bg-primary/5 h-14 mb-2 flex items-center justify-center text-sm text-primary/80">
          วางที่นี่
        </div>
      )}
      {children}
    </div>
  );
}
