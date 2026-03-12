"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import type { Sprint, TaskWithAssignee } from "@/types";
import { fetchSquadEpics, fetchGlobalEpics } from "@/lib/epic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/contexts/ToastContext";
import { CreateSprintModal } from "@/features/sprints/CreateSprintModal";
import { TaskModal, TaskFilterBar } from "@/features/board/components";
import { cn } from "@/lib/utils";
import {
  parseTaskFilterFromSearchParams,
  applyTaskFilter,
} from "@/lib/search-filter";
import { ExternalLink, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { DraggableTask } from "./DraggableTask";
import { DroppableSprint } from "./DroppableSprint";

export type BacklogBoardProps = {
  projectId: string;
  projectName: string;
  openCreateSprint?: boolean;
};

const POSITION_GAP = 1024;

function withSequentialPositions(tasks: TaskWithAssignee[]) {
  return tasks.map((task, index) => ({
    ...task,
    position: (index + 1) * POSITION_GAP,
  }));
}

function getNextPositionValue(tasks: TaskWithAssignee[]) {
  if (tasks.length === 0) return POSITION_GAP;
  return Math.max(...tasks.map((task) => task.position ?? 0)) + POSITION_GAP;
}

function getNextBoardPositionValue(tasks: TaskWithAssignee[]) {
  const todoTasks = tasks.filter((task) => task.status === "todo");
  if (todoTasks.length === 0) return POSITION_GAP;
  return Math.max(...todoTasks.map((task) => task.board_position ?? 0)) + POSITION_GAP;
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

export function BacklogBoard({ projectId, projectName, openCreateSprint = false }: BacklogBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskFilter = useMemo(
    () => parseTaskFilterFromSearchParams(searchParams),
    [searchParams]
  );
  const { showToast } = useToast();
  const [backlogTasks, setBacklogTasks] = useState<TaskWithAssignee[]>([]);
  const [tasksBySprint, setTasksBySprint] = useState<Record<string, TaskWithAssignee[]>>({});
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const [modalTask, setModalTask] = useState<TaskWithAssignee | null>(null);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [creatingIn, setCreatingIn] = useState<null | "backlog" | string>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [epicLabelMap, setEpicLabelMap] = useState<Record<string, string>>({});
  const [collapsedSprints, setCollapsedSprints] = useState<Record<string, boolean>>({});

  const filteredBacklogTasks = useMemo(
    () => applyTaskFilter(backlogTasks, taskFilter),
    [backlogTasks, taskFilter]
  );
  const filteredTasksBySprint = useMemo(() => {
    const out: Record<string, TaskWithAssignee[]> = {};
    for (const s of sprints) {
      out[s.id] = applyTaskFilter(tasksBySprint[s.id] ?? [], taskFilter);
    }
    return out;
  }, [sprints, tasksBySprint, taskFilter]);

  const supabase = createClient();
  const dragSnapshotRef = useRef<{
    backlogTasks: TaskWithAssignee[];
    tasksBySprint: Record<string, TaskWithAssignee[]>;
  } | null>(null);
  const backlogTasksRef = useRef<TaskWithAssignee[]>(backlogTasks);
  const tasksBySprintRef = useRef<Record<string, TaskWithAssignee[]>>(tasksBySprint);

  const allTasks = useMemo(
    () => [...backlogTasks, ...Object.values(tasksBySprint).flat()],
    [backlogTasks, tasksBySprint]
  );

  useEffect(() => {
    backlogTasksRef.current = backlogTasks;
  }, [backlogTasks]);

  useEffect(() => {
    tasksBySprintRef.current = tasksBySprint;
  }, [tasksBySprint]);

  const findTask = useCallback(
    (taskId: string): TaskWithAssignee | undefined =>
      allTasks.find((t) => t.id === taskId),
    [allTasks]
  );

  const toggleSprintCollapsed = useCallback((sprintId: string) => {
    setCollapsedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
  }, []);

  const getContainerIdForTask = useCallback(
    (taskId: string) => {
      const task = findTask(taskId);
      if (!task) return null;
      return task.sprint_id ?? "backlog";
    },
    [findTask]
  );

  const getContainerIdFromOverId = useCallback(
    (overId: string) => {
      if (overId === "backlog") return "backlog";
      if (overId.startsWith("sprint-")) return overId.replace("sprint-", "");
      return getContainerIdForTask(overId);
    },
    [getContainerIdForTask]
  );

  const persistContainerPositions = useCallback(
    async (
      nextBacklogTasks: TaskWithAssignee[],
      nextTasksBySprint: Record<string, TaskWithAssignee[]>,
      containers: string[],
      movedTask?: {
        id: string;
        from: string;
        to: string;
        oldStatus: TaskWithAssignee["status"];
        newStatus: TaskWithAssignee["status"];
        ticket_key?: string;
      }
    ) => {
      const uniqueContainers = Array.from(new Set(containers));
      const updates = uniqueContainers.flatMap((containerId) => {
        const tasksInContainer =
          containerId === "backlog"
            ? nextBacklogTasks
            : nextTasksBySprint[containerId] ?? [];
        return tasksInContainer.map((task) =>
          supabase
            .from("tasks")
            .update({
              sprint_id: containerId === "backlog" ? null : containerId,
              status: task.status,
              position: task.position,
            })
            .eq("id", task.id)
        );
      });

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        throw failed.error;
      }

      if (movedTask && movedTask.from !== movedTask.to) {
        try {
          await fetch("/api/activity-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "MOVE_TASK",
              targetType: "task",
              targetId: movedTask.id,
              details: {
                from_sprint_id: movedTask.from === "backlog" ? null : movedTask.from,
                to_sprint_id: movedTask.to === "backlog" ? null : movedTask.to,
                old_status: movedTask.oldStatus,
                new_status: movedTask.newStatus,
                ticket_key: movedTask.ticket_key ?? undefined,
              },
            }),
          });
        } catch {
          // ignore
        }
      }
    },
    [supabase]
  );

  const fetchData = useCallback(async () => {
    const [tasksRes, sprintsRes, usersRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true }),
      supabase
        .from("sprints")
        .select("*")
        .eq("project_id", projectId)
        .order("start_date", { ascending: true }),
      supabase.from("profiles").select("id, name, avatar_url").order("name"),
    ]);
    const profiles = usersRes.data ?? [];
    const allTasks = attachAssignees((tasksRes.data ?? []) as TaskWithAssignee[], profiles);
    const sprintList = sprintsRes.data ?? [];
    if (!sprintsRes.error) setSprints(sprintList);
    if (!usersRes.error) setUsers(profiles);
    setBacklogTasks(withSequentialPositions(allTasks.filter((t) => !t.sprint_id)));
    const bySprint: Record<string, TaskWithAssignee[]> = {};
    for (const s of sprintList) {
      bySprint[s.id] = withSequentialPositions(allTasks.filter((t) => t.sprint_id === s.id));
    }
    setTasksBySprint(bySprint);
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
  }, [projectId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (openCreateSprint) {
      setShowCreateSprint(true);
      router.replace(`/projects/${projectId}/backlog`, { scroll: false });
    }
  }, [openCreateSprint, projectId, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const task = findTask(id);
    if (task) {
      dragSnapshotRef.current = {
        backlogTasks,
        tasksBySprint,
      };
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

    const fromContainer = getContainerIdForTask(activeId);
    const toContainer = getContainerIdFromOverId(overId);
    if (!fromContainer || !toContainer) return;

    if (fromContainer === toContainer) {
      if (overId === "backlog" || overId.startsWith("sprint-")) return;

      if (fromContainer === "backlog") {
        setBacklogTasks((current) => {
          const oldIndex = current.findIndex((task) => task.id === activeId);
          const newIndex = current.findIndex((task) => task.id === overId);
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
            return current;
          }
          return withSequentialPositions(arrayMove(current, oldIndex, newIndex));
        });
        return;
      }

      setTasksBySprint((current) => {
        const items = current[fromContainer] ?? [];
        const oldIndex = items.findIndex((task) => task.id === activeId);
        const newIndex = items.findIndex((task) => task.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return current;
        }
        return {
          ...current,
          [fromContainer]: withSequentialPositions(arrayMove(items, oldIndex, newIndex)),
        };
      });
      return;
    }

    const sourceItems =
      fromContainer === "backlog"
        ? [...backlogTasks]
        : [...(tasksBySprint[fromContainer] ?? [])];
    const destinationItems =
      toContainer === "backlog"
        ? [...backlogTasks]
        : [...(tasksBySprint[toContainer] ?? [])];
    const activeIndex = sourceItems.findIndex((task) => task.id === activeId);
    if (activeIndex === -1) return;

    const [movingTask] = sourceItems.splice(activeIndex, 1);
    const destinationIndex =
      overId === "backlog" || overId.startsWith("sprint-")
        ? destinationItems.length
        : destinationItems.findIndex((task) => task.id === overId);
    const nextTask = {
      ...movingTask,
      sprint_id: toContainer === "backlog" ? null : toContainer,
      status: (toContainer === "backlog" ? "backlog" : "todo") as TaskWithAssignee["status"],
    };
    const insertAt =
      destinationIndex < 0 ? destinationItems.length : destinationIndex;
    destinationItems.splice(insertAt, 0, nextTask);

    if (fromContainer === "backlog") {
      setBacklogTasks(withSequentialPositions(sourceItems));
    } else {
      setTasksBySprint((current) => ({
        ...current,
        [fromContainer]: withSequentialPositions(sourceItems),
      }));
    }

    if (toContainer === "backlog") {
      setBacklogTasks(withSequentialPositions(destinationItems));
    } else {
      setTasksBySprint((current) => ({
        ...current,
        [toContainer]: withSequentialPositions(destinationItems),
      }));
    }
  };

  const handleDragCancel = () => {
    if (dragSnapshotRef.current) {
      setBacklogTasks(dragSnapshotRef.current.backlogTasks);
      setTasksBySprint(dragSnapshotRef.current.tasksBySprint);
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
      if (snapshot) {
        setBacklogTasks(snapshot.backlogTasks);
        setTasksBySprint(snapshot.tasksBySprint);
      }
      return;
    }

    const currentTask =
      backlogTasksRef.current.find((item) => item.id === taskId) ??
      Object.values(tasksBySprintRef.current)
        .flat()
        .find((item) => item.id === taskId);
    const finalContainer = currentTask?.sprint_id ?? "backlog";

    try {
      await persistContainerPositions(
        backlogTasksRef.current,
        tasksBySprintRef.current,
        [draggedTask.sprint_id ?? "backlog", finalContainer],
        {
          id: taskId,
          from: draggedTask.sprint_id ?? "backlog",
          to: finalContainer,
          oldStatus: draggedTask.status,
          ticket_key: draggedTask.ticket_key,
          newStatus: currentTask?.status ?? draggedTask.status,
        }
      );
    } catch {
      setBacklogTasks(snapshot.backlogTasks);
      setTasksBySprint(snapshot.tasksBySprint);
      await fetchData();
    }
  };

  const handleCreateSprintSuccess = useCallback(() => {
    fetchData();
    showToast("สร้าง Sprint เรียบร้อยแล้ว");
  }, [fetchData, showToast]);

  const handleCardClick = useCallback((task: TaskWithAssignee) => {
    setModalTask(task);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalTask(null);
    fetchData();
  }, [fetchData]);

  const handleModalSaved = useCallback(() => {
    fetchData();
    setModalTask(null);
  }, [fetchData]);

  const handleModalDeleted = useCallback(() => {
    fetchData();
    setModalTask(null);
  }, [fetchData]);

  const handleStartSprint = async (sprintId: string) => {
    // ปิดสปรินต์ที่กำลัง active อยู่ใน Squad นี้ก่อน (ให้เหลือเพียง 1 active ต่อ Squad)
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
    if (!error) {
      try {
        await fetch("/api/activity-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "START_SPRINT",
            targetType: "sprint",
            targetId: sprintId,
            details: { from: "backlog" },
          }),
        });
      } catch {
        // ignore
      }
      await fetchData();
    }
  };

  const handleCreateCard = async (sprintId: null | string) => {
    const title = newCardTitle.trim();
    if (!title) return;
    const containerTasks =
      sprintId === null ? backlogTasksRef.current : tasksBySprintRef.current[sprintId] ?? [];
    const nextPosition = getNextPositionValue(containerTasks);
    const nextBoardPosition =
      sprintId === null ? null : getNextBoardPositionValue(tasksBySprintRef.current[sprintId] ?? []);
    const payload = {
      project_id: projectId,
      sprint_id: sprintId,
      type: "task" as const,
      parent_id: null,
      title,
      tags: [] as string[],
      position: nextPosition,
      board_position: nextBoardPosition,
      status: sprintId ? "todo" : "backlog",
      priority: "medium" as const,
    };
    const tempId = `temp-${Date.now()}`;
    const tempTask: TaskWithAssignee = {
      id: tempId,
      project_id: projectId,
      sprint_id: sprintId,
      type: "task",
      parent_id: null,
      title,
      status: payload.status as TaskWithAssignee["status"],
      priority: "medium",
      description: null,
      tags: [],
      position: payload.position,
      board_position: payload.board_position,
      assignee_id: null,
      assignee: null,
      ticket_number: 0,
      ticket_key: "",
      epic_id: null,
    };
    if (sprintId === null) {
      setBacklogTasks((b) => [...b, tempTask]);
    } else {
      setTasksBySprint((s) => ({
        ...s,
        [sprintId]: [...(s[sprintId] ?? []), tempTask],
      }));
    }
    setNewCardTitle("");
    setCreatingIn(null);
    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      if (sprintId === null) setBacklogTasks((b) => b.filter((t) => t.id !== tempId));
      else setTasksBySprint((s) => ({ ...s, [sprintId]: (s[sprintId] ?? []).filter((t) => t.id !== tempId) }));
      return;
    }
    const createdTask = attachAssignees(
      [(data ?? { ...tempTask, id: tempId }) as TaskWithAssignee],
      users
    )[0];
    if (sprintId === null) {
      setBacklogTasks((b) => b.map((t) => (t.id === tempId ? createdTask : t)));
    } else {
      setTasksBySprint((s) => ({
        ...s,
        [sprintId]: (s[sprintId] ?? []).map((t) => (t.id === tempId ? createdTask : t)),
      }));
    }
    setModalTask(createdTask);

    // log create task
    try {
      await fetch("/api/activity-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_TASK",
          targetType: "task",
          targetId: createdTask.id,
          details: {
            project_id: projectId,
            sprint_id: sprintId,
            title,
            status: payload.status,
            ticket_key: createdTask.ticket_key ?? undefined,
          },
        }),
      });
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#EE4D2D]">Backlog Planning</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#222222]">
              Backlog - {projectName}
            </h1>
            <p className="mt-2 text-sm text-[#666666]">
              วางแผนงานใน backlog, จัดเข้ากับ sprint และสร้าง task ใหม่แบบรวดเร็ว
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="brandOutline"
              className="gap-2"
              onClick={() => {
                setCreatingIn("backlog");
                setNewCardTitle("");
              }}
            >
              <Plus className="h-4 w-4" />
              Add Card
            </Button>
            <Button onClick={() => setShowCreateSprint(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Sprint
            </Button>
          </div>
        </div>
      </section>

      <CreateSprintModal
        open={showCreateSprint}
        onClose={() => setShowCreateSprint(false)}
        projectId={projectId}
        existingSprintNames={sprints.map((s) => s.name)}
        onSuccess={handleCreateSprintSuccess}
      />

      <TaskFilterBar
        users={users}
        sprints={sprints.map((s) => ({ id: s.id, name: s.name }))}
        epics={Object.entries(epicLabelMap).map(([id, title]) => ({ id, title }))}
        showSprintFilter
      />

      <DndContext
        collisionDetection={closestCorners}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Backlog column (droppable) */}
          <div className="flex min-h-[360px] flex-1 flex-col rounded-xl border border-[#E8E8E8] bg-white p-4 lg:basis-3/4 lg:max-w-[75%]">
            <h3 className="mb-1 text-base font-semibold text-[#222222]">Backlog</h3>
            <p className="mb-3 text-xs text-[#666666]">
              ลากงานไป Sprint หรือลากกลับมาที่นี่
            </p>
            <DroppableSprint id="backlog" isBacklog>
              <SortableContext items={filteredBacklogTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {filteredBacklogTasks.map((task) => (
                    <DraggableTask key={task.id} task={task} onClick={handleCardClick} epicLabel={task.epic_id ? epicLabelMap[task.epic_id] ?? null : null} />
                  ))}
                </div>
              </SortableContext>
            </DroppableSprint>
            {creatingIn === "backlog" ? (
              <div className="mt-2 flex gap-1">
                <Input
                  autoFocus
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCard(null);
                    }
                    if (e.key === "Escape") setCreatingIn(null);
                  }}
                  placeholder="ชื่อ Task..."
                  className="text-sm h-9"
                />
                <Button size="sm" onClick={() => handleCreateCard(null)} disabled={!newCardTitle.trim()}>
                  บันทึก
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingIn("backlog")}
                className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-md py-2 px-3 w-full justify-center"
              >
                + Add Card
              </button>
            )}
          </div>

          {/* Sprint columns */}
          <div className="flex w-full flex-col gap-3 lg:basis-1/4 lg:max-w-[25%]">
            <h3 className="text-sm font-semibold text-[#222222]">Sprint List</h3>
            {sprints.length === 0 && (
              <p className="rounded-lg border border-dashed border-[#E8E8E8] bg-white px-3 py-3 text-xs text-[#666666]">
                ยังไม่มี Sprint ใน Squad นี้ — สร้าง Sprint จากปุ่ม Create Sprint ด้านบน
              </p>
            )}
            {sprints.map((sprint) => {
              const collapsed = collapsedSprints[sprint.id] ?? false;
              return (
                <div
                  key={sprint.id}
                  className={cn(
                    "flex flex-col rounded-xl border p-3",
                    sprint.status === "active"
                      ? "border-primary/30 bg-[#FFF8F6]"
                      : "border-[#E8E8E8] bg-white"
                  )}
                >
                  <div
                    className="mb-1 flex w-full items-start justify-between gap-2 text-left cursor-pointer"
                    onClick={() => toggleSprintCollapsed(sprint.id)}
                  >
                    <div className="flex flex-1 items-start gap-2">
                      {collapsed ? (
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-[#9E9E9E]" />
                      ) : (
                        <ChevronDown className="mt-0.5 h-3.5 w-3.5 text-[#9E9E9E]" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#222222]">
                          {sprint.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#666666]">
                          {sprint.start_date && sprint.end_date
                            ? `${sprint.start_date} – ${sprint.end_date}`
                            : "ยังไม่กำหนดช่วงเวลา"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {sprint.status === "planned" && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStartSprint(sprint.id);
                          }}
                        >
                          Start
                        </Button>
                      )}
                      {sprint.status === "active" && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Active
                        </span>
                      )}
                      {sprint.status === "completed" && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-[#666666]">
                          Done
                        </span>
                      )}
                      <Link
                        href={`/projects/${projectId}/board/${sprint.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                          sprint.status === "active"
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "text-[#666666] hover:bg-muted/60 hover:text-[#222222]"
                        )}
                        title="ไปที่ Board"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Go to Board</span>
                      </Link>
                    </div>
                  </div>

                  {!collapsed && (
                    <>
                      <DroppableSprint id={sprint.id} isBacklog={false}>
                        <SortableContext
                          items={(filteredTasksBySprint[sprint.id] ?? []).map(
                            (task) => task.id
                          )}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-1.5">
                            {(filteredTasksBySprint[sprint.id] ?? []).map((task) => (
                              <DraggableTask
                                key={task.id}
                                task={task}
                                onClick={handleCardClick}
                                epicLabel={
                                  task.epic_id ? epicLabelMap[task.epic_id] ?? null : null
                                }
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DroppableSprint>

                      {creatingIn === sprint.id ? (
                        <div className="mt-2 flex gap-1">
                          <Input
                            autoFocus
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateCard(sprint.id);
                              }
                              if (e.key === "Escape") setCreatingIn(null);
                            }}
                            placeholder="ชื่อ Task..."
                            className="h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => handleCreateCard(sprint.id)}
                            disabled={!newCardTitle.trim()}
                          >
                            บันทึก
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCreatingIn(sprint.id)}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
                        >
                          + Add Card
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="rounded-md border bg-background p-3 shadow-2xl opacity-95 cursor-grabbing ring-2 ring-primary/20">
              <span className="font-medium text-sm block">{activeTask.title}</span>
              <span className="text-xs text-muted-foreground">{activeTask.priority}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalTask && (
        <TaskModal
          task={modalTask}
          users={users}
          sprintId={modalTask.sprint_id ?? ""}
          projectId={projectId}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
          onDeleted={handleModalDeleted}
        />
      )}
    </div>
  );
}
