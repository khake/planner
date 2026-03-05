"use client";

import { useDroppable } from "@dnd-kit/core";
import type { TaskStatus } from "@/types";
import type { TaskWithAssignee } from "@/types";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";

type KanbanLaneProps = {
  id: TaskStatus;
  title: string;
  tasks: TaskWithAssignee[];
  attachmentCounts: Record<string, number>;
  coverImageByTask: Record<string, string>;
  onCardClick: (task: TaskWithAssignee) => void;
};

export function KanbanLane({
  id,
  title,
  tasks,
  attachmentCounts,
  coverImageByTask,
  onCardClick,
}: KanbanLaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane-${id}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-muted/30 min-h-[400px] p-3 transition-colors",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      <h3 className="font-semibold mb-2 text-sm text-foreground">{title}</h3>
      <div className="space-y-2 flex-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            attachmentCount={attachmentCounts[task.id] ?? 0}
            coverImageUrl={coverImageByTask[task.id]}
            onClick={() => onCardClick(task)}
          />
        ))}
      </div>
    </div>
  );
}
