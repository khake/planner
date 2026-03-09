"use client";

import { useRouter } from "next/navigation";
import type { Task, TaskWithAssignee } from "@/types";
import { TaskModal } from "./TaskModal";

type TicketDetailPageProps = {
  task: Task;
  users: { id: string; name: string; avatar_url: string | null }[];
};

export function TicketDetailPage({ task, users }: TicketDetailPageProps) {
  const router = useRouter();
  const taskWithAssignee: TaskWithAssignee = {
    ...task,
    assignee: task.assignee_id
      ? users.find((u) => u.id === task.assignee_id) ?? null
      : null,
  };

  return (
    <TaskModal
      task={taskWithAssignee}
      users={users}
      projectId={task.project_id}
      sprintId={task.sprint_id ?? ""}
      onClose={() => router.back()}
      onSaved={() => router.refresh()}
      onDeleted={() => router.push("/projects")}
    />
  );
}
