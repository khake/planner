"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import type { TaskStatus, TaskWithAssignee } from "@/types";
import type { Sprint } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KanbanLane } from "./KanbanLane";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";

const LANES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const BOARD_STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done"];

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatSprintDate(dateStr: string): string {
  const d = new Date(dateStr + "Z");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const month = THAI_MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function formatSprintDuration(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  return `${formatSprintDate(start)} – ${formatSprintDate(end)}`;
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Planning",
  active: "Active",
  completed: "Completed",
};

type KanbanBoardProps = {
  projectId: string;
  projectName: string;
  sprintId: string;
  sprintName: string;
  sprintStartDate?: string;
  sprintEndDate?: string;
  sprintStatus?: string;
  sprintGoal?: string;
  isActiveSprint?: boolean;
};

export function KanbanBoard({
  projectId,
  projectName,
  sprintId,
  sprintName,
  sprintStartDate,
  sprintEndDate,
  sprintStatus,
  sprintGoal,
  isActiveSprint = false,
}: KanbanBoardProps) {
  const durationStr = formatSprintDuration(sprintStartDate, sprintEndDate);
  const statusLabel = sprintStatus ? STATUS_LABELS[sprintStatus] ?? sprintStatus : null;
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [coverImageByTask, setCoverImageByTask] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const [modalTask, setModalTask] = useState<TaskWithAssignee | null>(null);
  const [showCompleteSprintModal, setShowCompleteSprintModal] = useState(false);
  const [incompleteDestination, setIncompleteDestination] = useState<"backlog" | string>("backlog");
  const [plannedSprints, setPlannedSprints] = useState<Sprint[]>([]);
  const [completing, setCompleting] = useState(false);
  const [startingSprint, setStartingSprint] = useState(false);
  const supabase = createClient();

  const handleStartSprint = useCallback(async () => {
    setStartingSprint(true);
    await supabase
      .from("sprints")
      .update({ status: "completed", actual_end_date: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("status", "active")
      .neq("id", sprintId);
    const { error } = await supabase
      .from("sprints")
      .update({ status: "active" })
      .eq("id", sprintId);
    setStartingSprint(false);
    if (!error) router.push(`/projects/${projectId}/board`);
  }, [projectId, sprintId, supabase, router]);

  const fetchData = useCallback(async () => {
    const [tasksRes, usersRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, assignee:users!assignee_id(id, name)")
        .eq("sprint_id", sprintId)
        .in("status", BOARD_STATUSES)
        .order("created_at", { ascending: true }),
      supabase.from("users").select("id, name, avatar_url").order("name"),
    ]);
    const taskList = (tasksRes.data ?? []) as TaskWithAssignee[];
    if (!tasksRes.error) setTasks(taskList);
    if (!usersRes.error) setUsers(usersRes.data ?? []);

    const taskIds = taskList.map((t) => t.id);
    if (taskIds.length > 0) {
      const [countsRes, imagesRes] = await Promise.all([
        supabase.from("attachments").select("task_id").in("task_id", taskIds),
        supabase
          .from("attachments")
          .select("task_id, file_url, file_type")
          .in("task_id", taskIds)
          .like("file_type", "image/%")
          .order("created_at", { ascending: true }),
      ]);
      const counts: Record<string, number> = {};
      for (const a of countsRes.data ?? []) {
        counts[a.task_id] = (counts[a.task_id] ?? 0) + 1;
      }
      setAttachmentCounts(counts);
      const firstImage: Record<string, string> = {};
      for (const row of imagesRes.data ?? []) {
        if (!firstImage[row.task_id]) firstImage[row.task_id] = row.file_url;
      }
      setCoverImageByTask(firstImage);
    } else {
      setAttachmentCounts({});
      setCoverImageByTask({});
    }
    setLoading(false);
  }, [sprintId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const task = tasks.find((t) => t.id === id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overId = String(over.id);
    const newStatus = BOARD_STATUSES.find((s) => `lane-${s}` === overId) as TaskStatus | undefined;
    if (!newStatus) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);
    if (!error) await fetchData();
  };

  const handleCardClick = (task: TaskWithAssignee) => {
    setModalTask(task);
  };

  const handleModalClose = () => {
    setModalTask(null);
    fetchData(); // อัปเดตจำนวนไฟล์แนบบนการ์ด
  };

  const handleModalSaved = () => {
    fetchData();
    setModalTask(null);
  };

  const handleModalDeleted = () => {
    fetchData();
    setModalTask(null);
  };

  const openCompleteSprintModal = useCallback(async () => {
    setShowCompleteSprintModal(true);
    const { data } = await supabase
      .from("sprints")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "planned")
      .order("start_date", { ascending: true });
    setPlannedSprints((data ?? []) as Sprint[]);
    setIncompleteDestination(data?.[0]?.id ?? "backlog");
  }, [projectId, supabase]);

  const handleCompleteSprint = async () => {
    setCompleting(true);
    const incompleteTasks = tasks.filter((t) => t.status !== "done");
    const incompleteIds = incompleteTasks.map((t) => t.id);

    if (incompleteIds.length > 0) {
      if (incompleteDestination === "backlog") {
        await supabase
          .from("tasks")
          .update({ sprint_id: null, status: "backlog" })
          .in("id", incompleteIds);
      } else {
        await supabase
          .from("tasks")
          .update({ sprint_id: incompleteDestination, status: "todo" })
          .in("id", incompleteIds);
      }
    }

    const { error } = await supabase
      .from("sprints")
      .update({ status: "completed", actual_end_date: new Date().toISOString() })
      .eq("id", sprintId);

    setCompleting(false);
    setShowCompleteSprintModal(false);
    if (!error) router.push(`/projects/${projectId}`);
  };

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  if (loading) {
    return <p className="text-muted-foreground">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{sprintName}</span>
            {durationStr && (
              <span className="text-muted-foreground">{durationStr}</span>
            )}
            {statusLabel && (
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                  sprintStatus === "active" && "bg-primary/15 text-primary",
                  sprintStatus === "planned" && "bg-muted text-muted-foreground",
                  sprintStatus === "completed" && "bg-muted text-muted-foreground"
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>
          {sprintGoal && (
            <p className="text-sm text-muted-foreground max-w-md">{sprintGoal}</p>
          )}
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Sprint: {doneCount}/{totalTasks} done
          </span>
          <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums">{progressPercent}%</span>
          {sprintStatus === "planned" && (
            <Button
              variant="default"
              onClick={handleStartSprint}
              disabled={startingSprint}
              className="ml-2"
            >
              {startingSprint ? "กำลังเริ่ม..." : "Start Sprint"}
            </Button>
          )}
          {isActiveSprint && (
            <Button variant="default" onClick={openCompleteSprintModal} className="ml-2">
              Complete Sprint
            </Button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-4 overflow-x-auto pb-4">
          {LANES.map((lane) => (
            <KanbanLane
              key={lane.id}
              id={lane.id}
              title={lane.label}
              tasks={tasksByStatus(lane.id)}
              attachmentCounts={attachmentCounts}
              coverImageByTask={coverImageByTask}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rounded-lg border bg-background shadow-lg opacity-95 cursor-grabbing w-64 overflow-hidden">
              <TaskCard
                task={activeTask}
                attachmentCount={attachmentCounts[activeTask.id] ?? 0}
                coverImageUrl={coverImageByTask[activeTask.id]}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalTask && (
        <TaskModal
          task={modalTask}
          users={users}
          sprintId={sprintId}
          projectId={projectId}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
          onDeleted={handleModalDeleted}
        />
      )}

      {showCompleteSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Complete Sprint</h3>
            <p className="text-sm text-muted-foreground mb-4">
              งานที่ยังไม่เสร็จ (Incomplete Tasks) จะย้ายไปที่ไหน?
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="incomplete-dest"
                  checked={incompleteDestination === "backlog"}
                  onChange={() => setIncompleteDestination("backlog")}
                  className="rounded-full border-input"
                />
                <span className="text-sm">ย้ายกลับไปที่ Backlog</span>
              </label>
              {plannedSprints.length > 0 && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="incomplete-dest"
                      checked={incompleteDestination !== "backlog"}
                      onChange={() => setIncompleteDestination(plannedSprints[0].id)}
                      className="rounded-full border-input"
                    />
                    <span className="text-sm">ย้ายไป Next Sprint</span>
                  </label>
                  {plannedSprints.length > 1 && (
                    <select
                      value={incompleteDestination === "backlog" ? plannedSprints[0].id : incompleteDestination}
                      onChange={(e) => setIncompleteDestination(e.target.value)}
                      className="ml-6 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      disabled={incompleteDestination === "backlog"}
                    >
                      {plannedSprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.start_date && s.end_date ? ` (${s.start_date} – ${s.end_date})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCompleteSprintModal(false)}
                disabled={completing}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleCompleteSprint} disabled={completing}>
                {completing ? "กำลังปิดสปรินท์..." : "ยืนยัน Complete Sprint"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
