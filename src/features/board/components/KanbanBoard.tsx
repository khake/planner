"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import type { TaskStatus, TaskWithAssignee } from "@/types";
import { fetchSquadEpics, fetchGlobalEpics } from "@/lib/epic";
import type { Sprint } from "@/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { KanbanLane } from "./KanbanLane";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { TaskFilterBar } from "./TaskFilterBar";
import {
  parseTaskFilterFromSearchParams,
  applyTaskFilter,
} from "@/lib/search-filter";

const LANES: { id: BoardLaneStatus; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

type BoardLaneStatus = Exclude<TaskStatus, "backlog">;
const BOARD_STATUSES: BoardLaneStatus[] = ["todo", "in_progress", "review", "done"];
const POSITION_GAP = 1024;

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

type LaneState = Record<BoardLaneStatus, TaskWithAssignee[]>;

function createEmptyLanes(): LaneState {
  return {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
}

function withSequentialBoardPositions(tasks: TaskWithAssignee[]): TaskWithAssignee[] {
  return tasks.map((task, index) => ({
    ...task,
    board_position: (index + 1) * POSITION_GAP,
  }));
}

function getNextPositionValue(tasks: Array<{ position: number }>) {
  if (tasks.length === 0) return POSITION_GAP;
  return Math.max(...tasks.map((task) => task.position ?? 0)) + POSITION_GAP;
}

function getNextBoardPositionValue(tasks: Array<{ board_position: number | null }>) {
  if (tasks.length === 0) return POSITION_GAP;
  return Math.max(...tasks.map((task) => task.board_position ?? 0)) + POSITION_GAP;
}

function attachAssignees(
  tasks: TaskWithAssignee[],
  profiles: { id: string; name: string; avatar_url: string | null }[]
) {
  return tasks.map((task) => ({
    ...task,
    assignee: task.assignee_id
      ? profiles.find((profile) => profile.id === task.assignee_id) ?? null
      : null,
  }));
}

export type KanbanBoardProps = {
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
  const searchParams = useSearchParams();
  const taskFilter = useMemo(
    () => parseTaskFilterFromSearchParams(searchParams),
    [searchParams]
  );
  const [lanes, setLanes] = useState<LaneState>(createEmptyLanes);
  const [users, setUsers] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [coverImageByTask, setCoverImageByTask] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const [modalTask, setModalTask] = useState<TaskWithAssignee | null>(null);
  const [modalInitialMode, setModalInitialMode] = useState<"view" | "edit">("view");
  const [showCompleteSprintModal, setShowCompleteSprintModal] = useState(false);
  const [incompleteDestination, setIncompleteDestination] = useState<"backlog" | string>("backlog");
  const [plannedSprints, setPlannedSprints] = useState<Sprint[]>([]);
  const [completing, setCompleting] = useState(false);
  const [startingSprint, setStartingSprint] = useState(false);
  const [epicLabelMap, setEpicLabelMap] = useState<Record<string, string>>({});
  const supabase = createClient();
  const dragSnapshotRef = useRef<LaneState | null>(null);
  const lanesRef = useRef<LaneState>(lanes);

  const allTasks = useMemo(
    () => BOARD_STATUSES.flatMap((status) => lanes[status]),
    [lanes]
  );

  const filteredLanes = useMemo(() => {
    const next: LaneState = createEmptyLanes();
    for (const status of BOARD_STATUSES) {
      next[status] = applyTaskFilter(lanes[status], taskFilter);
    }
    return next;
  }, [lanes, taskFilter]);

  useEffect(() => {
    lanesRef.current = lanes;
  }, [lanes]);

  const findTask = useCallback(
    (taskId: string) => allTasks.find((task) => task.id === taskId),
    [allTasks]
  );

  const getContainerForTask = useCallback(
    (taskId: string): BoardLaneStatus | null =>
      (findTask(taskId)?.status as BoardLaneStatus | undefined) ?? null,
    [findTask]
  );

  const getStatusFromOverId = useCallback(
    (overId: string): BoardLaneStatus | null => {
      if (overId.startsWith("lane-")) {
        return BOARD_STATUSES.find((status) => `lane-${status}` === overId) ?? null;
      }
      return getContainerForTask(overId);
    },
    [getContainerForTask]
  );

  const persistLanePositions = useCallback(
    async (
      nextLanes: LaneState,
      statuses: BoardLaneStatus[],
      movedTask?: { id: string; from: BoardLaneStatus; to: BoardLaneStatus; ticket_key?: string }
    ) => {
      const uniqueStatuses = Array.from(new Set(statuses));
      const updates = uniqueStatuses.flatMap((status) =>
        nextLanes[status].map((task) =>
          supabase
            .from("tasks")
            .update({ status, board_position: task.board_position })
            .eq("id", task.id)
        )
      );

      const results = await Promise.all(updates);
      const failed = results.find((result: { error: unknown }) => Boolean(result.error));
      if (failed?.error) {
        throw failed.error;
      }

      if (movedTask && movedTask.from !== movedTask.to) {
        try {
          await fetch("/api/activity-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "UPDATE_STATUS",
              targetType: "task",
              targetId: movedTask.id,
              details: {
                old_status: movedTask.from,
                new_status: movedTask.to,
                sprint_id: sprintId,
                ticket_key: movedTask.ticket_key ?? undefined,
              },
            }),
          });
        } catch {
          // ignore
        }
      }
    },
    [sprintId, supabase]
  );

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
        .select("*")
        .eq("sprint_id", sprintId)
        .in("status", BOARD_STATUSES)
        .order("board_position", { ascending: true }),
      supabase.from("profiles").select("id, name, avatar_url").order("name"),
    ]);
    const profiles = usersRes.data ?? [];
    const taskList = attachAssignees((tasksRes.data ?? []) as TaskWithAssignee[], profiles);
    if (!tasksRes.error) {
      const nextLanes = createEmptyLanes();
      for (const status of BOARD_STATUSES) {
        nextLanes[status] = withSequentialBoardPositions(
          taskList.filter((task) => task.status === status)
        );
      }
      setLanes(nextLanes);
    }
    if (!usersRes.error) setUsers(profiles);

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
    try {
      const [squadEpics, globalEpics] = await Promise.all([
        fetchSquadEpics(supabase, projectId),
        fetchGlobalEpics(supabase),
      ]);
      const map: Record<string, string> = {};
      for (const e of [...squadEpics, ...globalEpics]) map[e.id] = e.title;
      setEpicLabelMap(map);
    } catch {
      setEpicLabelMap({});
    }
    setLoading(false);
  }, [projectId, sprintId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const task = findTask(id);
    if (task) {
      dragSnapshotRef.current = lanes;
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeTask = findTask(activeId);
    if (!activeTask) return;

    const fromStatus = getContainerForTask(activeId);
    const toStatus = getStatusFromOverId(overId);
    if (!fromStatus || !toStatus) return;

    setLanes((current) => {
      if (fromStatus === toStatus) {
        if (overId.startsWith("lane-")) {
          return current;
        }
        const items = current[fromStatus];
        const oldIndex = items.findIndex((task) => task.id === activeId);
        const newIndex = items.findIndex((task) => task.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return current;
        }
        return {
          ...current,
          [fromStatus]: withSequentialBoardPositions(arrayMove(items, oldIndex, newIndex)),
        };
      }

      const sourceItems = [...current[fromStatus]];
      const destinationItems = current[toStatus];
      const activeIndex = sourceItems.findIndex((task) => task.id === activeId);
      if (activeIndex === -1) return current;

      const destinationIndex = overId.startsWith("lane-")
        ? destinationItems.length
        : destinationItems.findIndex((task) => task.id === overId);

      const [movingTask] = sourceItems.splice(activeIndex, 1);
      const nextTask = { ...movingTask, status: toStatus };
      const insertAt =
        destinationIndex < 0 ? destinationItems.length : destinationIndex;
      const nextDestinationItems = [...destinationItems];
      nextDestinationItems.splice(insertAt, 0, nextTask);

      return {
        ...current,
        [fromStatus]: withSequentialBoardPositions([...sourceItems]),
        [toStatus]: withSequentialBoardPositions(nextDestinationItems),
      };
    });
  };

  const handleDragCancel = () => {
    if (dragSnapshotRef.current) {
      setLanes(dragSnapshotRef.current);
    }
    dragSnapshotRef.current = null;
    setActiveTask(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const taskId = String(active.id);
    const draggedTask = activeTask;
    const snapshot = dragSnapshotRef.current;

    setActiveTask(null);
    dragSnapshotRef.current = null;

    if (!over || !draggedTask || !snapshot) {
      if (snapshot) setLanes(snapshot);
      return;
    }

    const finalStatus =
      BOARD_STATUSES.find((status) => lanesRef.current[status].some((task) => task.id === taskId)) ??
      (draggedTask.status as BoardLaneStatus);

    const changedStatuses: BoardLaneStatus[] = [
      draggedTask.status as BoardLaneStatus,
      finalStatus,
    ];

    try {
      await persistLanePositions(lanesRef.current, changedStatuses, {
        id: taskId,
        from: draggedTask.status as BoardLaneStatus,
        to: finalStatus,
        ticket_key: draggedTask.ticket_key,
      });
    } catch {
      setLanes(snapshot);
      await fetchData();
    }
  };

  const handleCardClick = (task: TaskWithAssignee) => {
    setModalInitialMode("view");
    setModalTask(task);
  };

  const handleCardDoubleClick = (task: TaskWithAssignee) => {
    setModalInitialMode("edit");
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
    const incompleteTasks = allTasks.filter((t) => t.status !== "done");

    if (incompleteTasks.length > 0) {
      if (incompleteDestination === "backlog") {
        const { data: backlogTasks } = await supabase
          .from("tasks")
          .select("position")
          .eq("project_id", projectId)
          .is("sprint_id", null);
        let nextPosition = getNextPositionValue(
          (backlogTasks ?? []) as Array<{ position: number }>
        );
        await Promise.all(
          incompleteTasks.map((task) => {
            const currentPosition = nextPosition;
            nextPosition += POSITION_GAP;
            return supabase
              .from("tasks")
              .update({
                sprint_id: null,
                status: "backlog",
                position: currentPosition,
                board_position: null,
              })
              .eq("id", task.id);
          })
        );
      } else {
        const { data: destinationTasks } = await supabase
          .from("tasks")
          .select("position, status, board_position")
          .eq("project_id", projectId)
          .eq("sprint_id", incompleteDestination);
        let nextPosition = getNextPositionValue(
          (destinationTasks ?? []) as Array<{ position: number }>
        );
        let nextBoardPosition = getNextBoardPositionValue(
          ((destinationTasks ?? []).filter((task) => task.status === "todo")) as Array<{
            board_position: number | null;
          }>
        );
        await Promise.all(
          incompleteTasks.map((task) => {
            const currentPosition = nextPosition;
            const currentBoardPosition = nextBoardPosition;
            nextPosition += POSITION_GAP;
            nextBoardPosition += POSITION_GAP;
            return supabase
              .from("tasks")
              .update({
                sprint_id: incompleteDestination,
                status: "todo",
                position: currentPosition,
                board_position: currentBoardPosition,
              })
              .eq("id", task.id);
          })
        );
      }
    }

    const { error } = await supabase
      .from("sprints")
      .update({ status: "completed", actual_end_date: new Date().toISOString() })
      .eq("id", sprintId);

    setCompleting(false);
    setShowCompleteSprintModal(false);
    if (!error) {
      try {
        await fetch("/api/activity-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "COMPLETE_SPRINT",
            targetType: "sprint",
            targetId: sprintId,
            details: {
              moved_incomplete_to: incompleteDestination,
              incomplete_task_count: incompleteTasks.length,
            },
          }),
        });
      } catch {
        // ignore
      }
      router.push(`/projects/${projectId}`);
    }
  };

  const filteredAllTasks = useMemo(
    () => BOARD_STATUSES.flatMap((status) => filteredLanes[status]),
    [filteredLanes]
  );
  const tasksByStatus = (status: BoardLaneStatus) => filteredLanes[status] ?? [];

  const doneCount = filteredAllTasks.filter((t) => t.status === "done").length;
  const totalTasks = filteredAllTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  if (loading) {
    return <p className="text-muted-foreground">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-4">
      <TaskFilterBar
        users={users}
        epics={Object.entries(epicLabelMap).map(([id, title]) => ({ id, title }))}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
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
              size="sm"
              onClick={handleStartSprint}
              disabled={startingSprint}
              className="ml-2"
            >
              {startingSprint ? "กำลังเริ่ม..." : "Start Sprint"}
            </Button>
          )}
          {isActiveSprint && (
            <Button size="sm" onClick={openCompleteSprintModal} className="ml-2">
              Complete Sprint
            </Button>
          )}
        </div>
      </div>

      <DndContext
        collisionDetection={closestCorners}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
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
                epicLabelMap={epicLabelMap}
                onCardClick={handleCardClick}
                onCardDoubleClick={handleCardDoubleClick}
              />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="rounded-lg border bg-background shadow-lg opacity-95 cursor-grabbing w-64 overflow-hidden">
              <TaskCard
                task={activeTask}
                attachmentCount={attachmentCounts[activeTask.id] ?? 0}
                coverImageUrl={coverImageByTask[activeTask.id]}
                epicLabel={activeTask.epic_id ? epicLabelMap[activeTask.epic_id] ?? null : null}
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
          initialMode={modalInitialMode}
          autoFocusDescription={modalInitialMode === "edit"}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
          onDeleted={handleModalDeleted}
        />
      )}

      <Modal
        open={showCompleteSprintModal}
        onClose={() => setShowCompleteSprintModal(false)}
        size="md"
      >
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
      </Modal>
    </div>
  );
}
