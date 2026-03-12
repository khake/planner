"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
  epicLabelMap?: Record<string, string>;
  onCardClick: (task: TaskWithAssignee) => void;
  onCardDoubleClick?: (task: TaskWithAssignee) => void;
  /** โปรไฟล์สมาชิกทั้งหมดของ Squad เพื่อ map หา QA assignee */
  users?: { id: string; name: string; avatar_url: string | null }[];
};

export function KanbanLane({
  id,
  title,
  tasks,
  attachmentCounts,
  coverImageByTask,
  epicLabelMap = {},
  onCardClick,
  onCardDoubleClick,
  users = [],
}: KanbanLaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane-${id}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[420px] flex-col rounded-xl border border-[#E8E8E8] bg-white p-4 transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/40"
      )}
    >
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#666666]">
        {title}
      </h3>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {tasks.map((task) => {
            const qaUser =
              task.qa_assignee_id &&
              users.find((u) => u.id === task.qa_assignee_id);
            return (
              <TaskCard
                key={task.id}
                task={task}
                attachmentCount={attachmentCounts[task.id] ?? 0}
                coverImageUrl={coverImageByTask[task.id]}
                epicLabel={task.epic_id ? epicLabelMap[task.epic_id] ?? null : null}
                qaAssigneeName={qaUser?.name ?? null}
                onClick={() => onCardClick(task)}
                onDoubleClick={() => onCardDoubleClick?.(task)}
              />
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}
