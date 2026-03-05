"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import type { Sprint, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/contexts/ToastContext";
import { CreateSprintModal } from "@/features/sprints/CreateSprintModal";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { DraggableTask } from "./DraggableTask";
import { DroppableSprint } from "./DroppableSprint";

type BacklogBoardProps = {
  projectId: string;
  projectName: string;
  openCreateSprint?: boolean;
};

export function BacklogBoard({ projectId, projectName, openCreateSprint = false }: BacklogBoardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [tasksBySprint, setTasksBySprint] = useState<Record<string, Task[]>>({});
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [creatingIn, setCreatingIn] = useState<null | "backlog" | string>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const supabase = createClient();

  const findTask = useCallback(
    (taskId: string): Task | undefined =>
      backlogTasks.find((t) => t.id === taskId) ??
      Object.values(tasksBySprint).flat().find((t) => t.id === taskId),
    [backlogTasks, tasksBySprint]
  );

  const fetchData = useCallback(async () => {
    const [tasksRes, sprintsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("sprints")
        .select("*")
        .eq("project_id", projectId)
        .order("start_date", { ascending: true }),
    ]);
    const allTasks: Task[] = (tasksRes.data ?? []) as Task[];
    const sprintList = sprintsRes.data ?? [];
    if (!sprintsRes.error) setSprints(sprintList);
    setBacklogTasks(allTasks.filter((t) => !t.sprint_id));
    const bySprint: Record<string, Task[]> = {};
    for (const s of sprintList) {
      bySprint[s.id] = allTasks.filter((t) => t.sprint_id === s.id);
    }
    setTasksBySprint(bySprint);
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
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const taskId = active.id as string;
    const task = findTask(taskId);
    setActiveTask(null);
    if (!over || !task) return;
    const overId = String(over.id);
    let newSprintId: string | null;
    if (overId === "backlog") newSprintId = null;
    else if (overId.startsWith("sprint-")) newSprintId = overId.replace("sprint-", "");
    else return;
    const prevBacklog = [...backlogTasks];
    const prevBySprint = { ...tasksBySprint };

    const isInBacklog = !task.sprint_id;
    const fromSprintId = task.sprint_id ?? null;

    const newStatus = newSprintId === null ? "backlog" : "todo";
    if (isInBacklog) {
      setBacklogTasks((b) => b.filter((t) => t.id !== taskId));
    } else if (fromSprintId) {
      setTasksBySprint((s) => ({
        ...s,
        [fromSprintId]: (s[fromSprintId] ?? []).filter((t) => t.id !== taskId),
      }));
    }
    if (newSprintId === null) {
      setBacklogTasks((b) => [...b, { ...task, sprint_id: null, status: "backlog" }]);
    } else {
      setTasksBySprint((s) => ({
        ...s,
        [newSprintId]: [...(s[newSprintId] ?? []), { ...task, sprint_id: newSprintId, status: "todo" }],
      }));
    }

    const { error } = await supabase
      .from("tasks")
      .update({ sprint_id: newSprintId, status: newStatus })
      .eq("id", taskId);
    if (error) {
      setBacklogTasks(prevBacklog);
      setTasksBySprint(prevBySprint);
    }
  };

  const handleCreateSprintSuccess = useCallback(() => {
    fetchData();
    showToast("สร้าง Sprint เรียบร้อยแล้ว");
  }, [fetchData, showToast]);

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
    if (!error) await fetchData();
  };

  const handleCreateCard = async (sprintId: null | string) => {
    const title = newCardTitle.trim();
    if (!title) return;
    const payload = {
      project_id: projectId,
      sprint_id: sprintId,
      title,
      status: sprintId ? "todo" : "backlog",
      priority: "medium" as const,
    };
    const tempId = `temp-${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      project_id: projectId,
      sprint_id: sprintId,
      title,
      status: payload.status,
      priority: "medium",
      description: null,
      assignee_id: null,
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
    const { data, error } = await supabase.from("tasks").insert(payload).select("id").single();
    if (error) {
      if (sprintId === null) setBacklogTasks((b) => b.filter((t) => t.id !== tempId));
      else setTasksBySprint((s) => ({ ...s, [sprintId]: (s[sprintId] ?? []).filter((t) => t.id !== tempId) }));
      return;
    }
    if (sprintId === null) {
      setBacklogTasks((b) => b.map((t) => (t.id === tempId ? { ...t, id: data.id } : t)));
    } else {
      setTasksBySprint((s) => ({
        ...s,
        [sprintId]: (s[sprintId] ?? []).map((t) => (t.id === tempId ? { ...t, id: data.id } : t)),
      }));
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline">← Squads</Button>
          </Link>
        </div>
        <Button onClick={() => setShowCreateSprint(true)}>Create Sprint</Button>
      </div>

      <h1 className="text-2xl font-bold">Backlog — {projectName}</h1>

      <CreateSprintModal
        open={showCreateSprint}
        onClose={() => setShowCreateSprint(false)}
        projectId={projectId}
        existingSprintNames={sprints.map((s) => s.name)}
        onSuccess={handleCreateSprintSuccess}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Backlog column (droppable) */}
          <div className="rounded-lg border bg-muted/30 p-4 min-h-[320px] flex flex-col">
            <h3 className="font-semibold mb-1 text-foreground">Backlog</h3>
            <p className="text-xs text-muted-foreground mb-2">
              ลากงานไป Sprint หรือลากกลับมาที่นี่
            </p>
            <DroppableSprint id="backlog" isBacklog>
              <div className="space-y-2">
                {backlogTasks.map((task) => (
                  <DraggableTask key={task.id} task={task} />
                ))}
              </div>
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
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className={cn(
                "rounded-lg border p-4 min-h-[320px] flex flex-col",
                sprint.status === "active"
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <Link
                  href={`/projects/${projectId}/board/${sprint.id}`}
                  className={cn(
                    "flex-1 min-w-0 rounded-md -m-1 p-1 transition-colors cursor-pointer",
                    "hover:bg-muted/60",
                    sprint.status === "active" && "text-primary font-semibold"
                  )}
                >
                  <h3 className="font-semibold truncate">{sprint.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sprint.start_date && sprint.end_date
                      ? `${sprint.start_date} – ${sprint.end_date}`
                      : "—"}
                  </p>
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  {sprint.status === "planned" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        handleStartSprint(sprint.id);
                      }}
                    >
                      Start Sprint
                    </Button>
                  )}
                  {sprint.status === "active" && (
                    <span className="text-xs text-primary font-medium whitespace-nowrap">Active</span>
                  )}
                  {sprint.status === "completed" && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Done</span>
                  )}
                  <Link
                    href={`/projects/${projectId}/board/${sprint.id}`}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs rounded-md px-2 py-1 transition-colors",
                      sprint.status === "active"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                    title="ไปที่ Board"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Go to Board</span>
                  </Link>
                </div>
              </div>
              <DroppableSprint id={sprint.id} isBacklog={false}>
                <div className="space-y-2">
                  {(tasksBySprint[sprint.id] ?? []).map((task) => (
                    <DraggableTask key={task.id} task={task} />
                  ))}
                </div>
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
                    className="text-sm h-9"
                  />
                  <Button size="sm" onClick={() => handleCreateCard(sprint.id)} disabled={!newCardTitle.trim()}>
                    บันทึก
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingIn(sprint.id)}
                  className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-md py-2 px-3 w-full justify-center"
                >
                  + Add Card
                </button>
              )}
            </div>
          ))}
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
    </div>
  );
}
