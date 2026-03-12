"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { createClient, handleAuthErrorAndRedirect } from "@/lib/supabase/client";
import type { TaskStatus, TaskPriority, TaskType, Task, TaskWithAssignee, Attachment, Epic } from "@/types";
import { fetchSquadEpics, fetchGlobalEpics } from "@/lib/epic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { getTagClassName, getTaskTypeMeta, normalizeTaskTag } from "@/lib/task-ui";
import { cn } from "@/lib/utils";
import { Paperclip, Download, Trash2, Image as ImageIcon, FileText, File, X, Maximize2, MessageCircle, Send, Plus, XCircle, Copy, ExternalLink, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TaskCommentWithUser } from "@/types";

const BUCKET = "task-artifacts";
const POSITION_GAP = 1024;

async function getNextBoardPositionForLane(
  supabase: ReturnType<typeof createClient>,
  sprintId: string,
  status: Exclude<TaskStatus, "backlog">,
  excludeTaskId?: string
) {
  let query = supabase
    .from("tasks")
    .select("board_position")
    .eq("sprint_id", sprintId)
    .eq("status", status)
    .order("board_position", { ascending: false })
    .limit(1);

  if (excludeTaskId) {
    query = query.neq("id", excludeTaskId);
  }

  const { data } = await query;
  const maxBoardPosition = data?.[0]?.board_position ?? 0;
  return maxBoardPosition + POSITION_GAP;
}

function attachCommentAuthors(
  comments: TaskCommentWithUser[],
  profiles: { id: string; name: string; avatar_url: string | null }[]
) {
  return comments.map((comment) => ({
    ...comment,
    user: comment.author_id
      ? profiles.find((profile) => profile.id === comment.author_id) ?? null
      : null,
  }));
}

function getAttachmentIcon(att: { file_type: string | null }): LucideIcon {
  if (att.file_type?.startsWith("image/")) return ImageIcon;
  const t = (att.file_type ?? "").toLowerCase();
  if (t.includes("pdf") || t.includes("document") || t.includes("msword") || t.includes("word")) return FileText;
  return File;
}

function ImagePreviewModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        else onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative flex h-[90vh] w-[90vw] max-h-[90vh] max-w-[90vw] items-center justify-center p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-full w-full min-h-0 min-w-0">
          <Image
            src={imageUrl}
            alt="Preview"
            fill
            className="object-contain"
            sizes="90vw"
            unoptimized
          />
        </div>
        <div className="absolute right-2 top-2 flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={handleFullscreen}
            title="เต็มจอ"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={onClose}
            title="ปิด"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS: TaskStatus[] = ["backlog", "todo", "in_progress", "review", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];
const TYPE_OPTIONS: TaskType[] = ["story", "task", "bug", "subtask"];

type TaskModalProps = {
  task: TaskWithAssignee;
  users: { id: string; name: string; avatar_url: string | null }[];
  sprintId: string;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  initialMode?: "view" | "edit";
  autoFocusDescription?: boolean;
};

export function TaskModal({
  task,
  users,
  projectId,
  onClose,
  onSaved,
  onDeleted,
  initialMode = "view",
  autoFocusDescription = false,
}: TaskModalProps) {
  const [isEditMode, setIsEditMode] = useState(initialMode === "edit");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [issueType, setIssueType] = useState<TaskType>(task.type);
  const [parentId, setParentId] = useState(task.parent_id ?? "");
  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(task.assignee_id ?? "");
  const [epicId, setEpicId] = useState<string>(task.epic_id ?? "");
  const [squadEpics, setSquadEpics] = useState<Epic[]>([]);
  const [globalEpics, setGlobalEpics] = useState<Epic[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<TaskCommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentAuthorId, setCommentAuthorId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("ผู้ใช้");
  const [loadingComments, setLoadingComments] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const supabase = createClient();
  const canSendComment = newComment.trim().length > 0;
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocusDescription && isEditMode && descriptionRef.current) {
      descriptionRef.current.focus();
      const len = descriptionRef.current.value.length;
      descriptionRef.current.setSelectionRange(len, len);
    }
  }, [autoFocusDescription, isEditMode]);

  const loadAttachments = useCallback(async () => {
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    if (error) {
      if (await handleAuthErrorAndRedirect(error)) return;
      setAttachments([]);
      return;
    }
    setAttachments(data ?? []);
  }, [task.id, supabase]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const loadSquadEpics = useCallback(async () => {
    try {
      const list = await fetchSquadEpics(supabase, projectId);
      setSquadEpics(list);
    } catch {
      setSquadEpics([]);
    }
  }, [projectId, supabase]);

  const loadGlobalEpics = useCallback(async () => {
    try {
      const list = await fetchGlobalEpics(supabase);
      setGlobalEpics(list);
    } catch {
      setGlobalEpics([]);
    }
  }, [supabase]);

  const loadAvailableTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .neq("id", task.id)
      .order("position", { ascending: true });
    setAvailableTasks((data ?? []) as Task[]);
  }, [projectId, supabase, task.id]);

  const loadSubtasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("parent_id", task.id)
      .order("position", { ascending: true });
    setSubtasks((data ?? []) as Task[]);
  }, [supabase, task.id]);

  useEffect(() => {
    loadSquadEpics();
    loadGlobalEpics();
    loadAvailableTasks();
    loadSubtasks();
  }, [loadSquadEpics, loadGlobalEpics, loadAvailableTasks, loadSubtasks]);

  useEffect(() => {
    const setCurrentUserFromAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;
      if (!authUser) return;

      const metadataName =
        typeof authUser.user_metadata?.name === "string"
          ? authUser.user_metadata.name.trim()
          : "";
      const emailName = authUser.email?.split("@")[0]?.trim() ?? "";
      const displayName = metadataName || emailName || "ผู้ใช้";
      const match = users.find((u) => u.id === authUser.id);

      setCommentAuthorId(match?.id ?? null);
      setCurrentUserName(match?.name ?? displayName);
    };
    setCurrentUserFromAuth();
  }, [supabase, users]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });
    setComments(
      attachCommentAuthors((data ?? []) as TaskCommentWithUser[], users)
    );
    setLoadingComments(false);
  }, [task.id, supabase, users]);

  // Lazy load comments only when Activity panel is opened
  useEffect(() => {
    if (isActivityOpen) loadComments();
  }, [isActivityOpen, loadComments]);

  const handleSendComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    setSendingComment(true);
    const author = commentAuthorId ? users.find((u) => u.id === commentAuthorId) : null;
    const authorName = currentUserName || author?.name || "ผู้ใช้";
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: TaskCommentWithUser = {
      id: tempId,
      task_id: task.id,
      author_name: authorName,
      author_id: commentAuthorId,
      content,
      created_at: new Date().toISOString(),
      user: author ? { id: author.id, name: author.name, avatar_url: author.avatar_url } : null,
    };
    setComments((prev) => [optimisticComment, ...prev]);
    setNewComment("");
    const { error } = await supabase.from("task_comments").insert({
      task_id: task.id,
      author_name: authorName,
      author_id: commentAuthorId,
      content,
    });
    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setSendingComment(false);
      return;
    }
    await loadComments();
    setSendingComment(false);
  };

  const handleAddTag = (rawValue: string) => {
    const normalizedTag = normalizeTaskTag(rawValue);
    if (!normalizedTag) return;
    setTags((current) =>
      current.includes(normalizedTag) ? current : [...current, normalizedTag]
    );
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags((current) => current.filter((item) => item !== tag));
  };

  const handleCreateSubtask = async () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setCreatingSubtask(true);
    const position =
      subtasks.length > 0
        ? Math.max(...subtasks.map((subtask) => subtask.position ?? 0)) + 1024
        : 1024;
    const boardPosition =
      task.sprint_id
        ? await getNextBoardPositionForLane(supabase, task.sprint_id, "todo")
        : null;
    const payload = {
      project_id: projectId,
      sprint_id: task.sprint_id,
      type: "subtask" as const,
      parent_id: task.id,
      title,
      description: null,
      tags: [] as string[],
      position,
      board_position: boardPosition,
      status: task.sprint_id ? "todo" : "backlog",
      priority: "medium" as const,
      assignee_id: null,
    };
    const { data, error } = await supabase.from("tasks").insert(payload).select("*").single();
    setCreatingSubtask(false);
    if (error) return;
    setNewSubtaskTitle("");
    setSubtasks((current) => [...current, data as Task].sort((a, b) => a.position - b.position));
    setAvailableTasks((current) => [...current, data as Task].sort((a, b) => a.position - b.position));
  };

  const handleToggleSubtask = async (subtask: Task, checked: boolean) => {
    const nextStatus: TaskStatus = checked ? "done" : task.sprint_id ? "todo" : "backlog";
    const nextBoardPosition =
      task.sprint_id && nextStatus !== "backlog"
        ? await getNextBoardPositionForLane(
            supabase,
            task.sprint_id,
            nextStatus as Exclude<TaskStatus, "backlog">,
            subtask.id
          )
        : null;
    setSubtasks((current) =>
      current.map((item) =>
        item.id === subtask.id
          ? { ...item, status: nextStatus, board_position: nextBoardPosition }
          : item
      )
    );
    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus, board_position: nextBoardPosition })
      .eq("id", subtask.id);
    if (error) {
      setSubtasks((current) =>
        current.map((item) => (item.id === subtask.id ? subtask : item))
      );
    }
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadError(null);
    setUploading(true);
    const errors: string[] = [];
    for (const file of list) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
      const path = `${task.id}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (uploadErr) {
        errors.push(`${file.name}: ${uploadErr.message}`);
        continue;
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error: insertErr } = await supabase.from("attachments").insert({
        task_id: task.id,
        file_url: pub.publicUrl,
        file_name: file.name,
        file_type: file.type || null,
      });
      if (insertErr) errors.push(`${file.name} (บันทึก): ${insertErr.message}`);
    }
    if (errors.length > 0) {
      setUploadError(errors.join(" • "));
    }
    await loadAttachments();
    setUploading(false);
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    try {
      const url = new URL(att.file_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/task-artifacts\/(.+)/);
      const path = pathMatch ? pathMatch[1] : null;
      if (path) await supabase.storage.from(BUCKET).remove([path]);
    } catch {
      /* ignore */
    }
    await supabase.from("attachments").delete().eq("id", att.id);
    await loadAttachments();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const markdownDescription = description.trim();
    const nextBoardPosition =
      task.sprint_id && status !== "backlog" && status !== task.status
        ? await getNextBoardPositionForLane(
            supabase,
            task.sprint_id,
            status as Exclude<TaskStatus, "backlog">,
            task.id
          )
        : status === "backlog"
          ? null
          : task.board_position;
    const { error } = await supabase
      .from("tasks")
      .update({
        type: issueType,
        parent_id: parentId || null,
        title: title.trim(),
        description: markdownDescription === "" ? null : markdownDescription,
        tags,
        status,
        board_position: nextBoardPosition,
        priority,
        assignee_id: assigneeId || null,
        epic_id: epicId || null,
      })
      .eq("id", task.id);
    setSaving(false);
    if (!error) onSaved();
  };

  const handleDelete = async () => {
    if (!confirm("ลบงานนี้?")) return;
    setDeleting(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setDeleting(false);
    if (!error) onDeleted();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative h-[90vh] w-[90vw] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-1 overflow-y-auto bg-muted/20 p-5 md:p-6"
        >
          <div className="flex min-h-full flex-col">
          <div className="mb-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {isEditMode ? "แก้ไขงาน" : "รายละเอียดงาน"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isEditMode
                    ? "แก้ไขรายละเอียดงาน ไฟล์แนบ และข้อมูลพื้นฐานของ task ได้จากส่วนนี้"
                    : "ดูรายละเอียดงาน — กด แก้ไข เพื่อเปลี่ยนข้อมูล"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    แก้ไข
                  </Button>
                )}
              {task.ticket_key && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border bg-muted/50 px-2 py-1 font-mono text-sm font-medium text-muted-foreground">
                    {task.ticket_key}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(task.ticket_key);
                    }}
                    title="คัดลอก ticket key"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    คัดลอก key
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/tickets/${encodeURIComponent(task.ticket_key)}`;
                      navigator.clipboard.writeText(url);
                    }}
                    title="คัดลอกลิงก์เปิดงาน"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    คัดลอกลิงก์
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      const path = `/tickets/${encodeURIComponent(task.ticket_key)}`;
                      window.open(path, "_blank");
                    }}
                    title="เปิดหน้ารายละเอียดงานในแท็บใหม่"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    เปิดหน้า ticket
                  </Button>
                </div>
              )}
            </div>
          </div>
          {!isEditMode ? (
            <div className="min-h-full">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.8fr)_minmax(260px,0.9fr)]">
                {/* ซ้าย: ชื่อ + รายละเอียด */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#222222]">
                      {task.title}
                    </h3>
                    {description && description.trim() && (
                      <div className="mt-2 rounded-lg border bg-card/40 px-4 py-3">
                        <MarkdownViewer value={description} className="text-sm leading-6" />
                      </div>
                    )}
                  </div>
                </div>

                {/* ขวา: ข้อมูลการ์ดแบบ summary */}
                <aside className="space-y-3 rounded-xl border bg-card/60 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      สถานะ
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {task.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      ความสำคัญ
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      ประเภท
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {(() => {
                        const meta = getTaskTypeMeta(task.type);
                        const Icon = meta.icon;
                        return (
                          <>
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </>
                        );
                      })()}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      ผู้รับผิดชอบ
                    </span>
                    <span className="inline-flex max-w-[160px] items-center justify-end gap-2 text-xs">
                      {users.find((u) => u.id === task.assignee_id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E0E0E0] text-[10px]">
                            {users
                              .find((u) => u.id === task.assignee_id)!
                              .name.charAt(0)
                              .toUpperCase()}
                          </span>
                          <span className="max-w-[110px] truncate">
                            {users.find((u) => u.id === task.assignee_id)!.name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">ยังไม่ระบุ</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Epic
                    </span>
                    <div className="flex max-w-[180px] flex-wrap justify-end gap-1 text-xs">
                      {task.epic_id ? (
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 font-medium">
                          {[
                            ...squadEpics,
                            ...globalEpics,
                          ].find((e) => e.id === task.epic_id)?.title ?? "Epic"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">ยังไม่ระบุ</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Parent
                    </span>
                    <div className="max-w-[180px] text-right text-xs">
                      {task.parent_id ? (
                        <span className="line-clamp-2 text-ellipsis">
                          {availableTasks.find((p) => p.id === task.parent_id)?.title ??
                            "—"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">ไม่มี</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tags
                    </span>
                    <div className="flex max-w-[200px] flex-wrap justify-end gap-1">
                      {(task.tags ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">ยังไม่มี</span>
                      ) : (
                        task.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              getTagClassName(tag)
                            )}
                          >
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </aside>
              </div>

              <div className="mt-6 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditMode(true)} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  แก้ไข
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  ปิด
                </Button>
              </div>
            </div>
          ) : (
          <form id="task-form" onSubmit={handleSave} className="flex min-h-full flex-col gap-4">
            <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
              {/* ซ้าย 70%: Description / Requirement + Attachments */}
              <div className="flex min-h-[520px] min-w-0 flex-col space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                <div>
                  <Label htmlFor="modal-title">ชื่องาน</Label>
                  <Input
                    id="modal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={saving || deleting}
                    className="mt-1"
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <Label htmlFor="modal-desc">รายละเอียด / Requirement</Label>
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="พิมพ์ requirement, หมายเหตุ หรือรายละเอียดงาน (Markdown รองรับหัวข้อ, ลิสต์, code block)"
                    className="mt-1 flex-1"
                    textareaRef={descriptionRef}
                    disabled={deleting}
                    submitting={saving}
                  />
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#222222]">Subtasks</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        แตกงานย่อยของ task นี้และติ๊กว่าเสร็จแล้วได้ทันที
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleCreateSubtask();
                        }
                      }}
                      placeholder="เพิ่ม subtask..."
                      disabled={saving || deleting || creatingSubtask}
                    />
                    <Button
                      type="button"
                      variant="brandOutline"
                      className="gap-2"
                      disabled={creatingSubtask || !newSubtaskTitle.trim()}
                      onClick={() => void handleCreateSubtask()}
                    >
                      <Plus className="h-4 w-4" />
                      เพิ่ม
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {subtasks.length === 0 ? (
                      <p className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
                        ยังไม่มี subtask ใต้ task นี้
                      </p>
                    ) : (
                      subtasks.map((subtask) => {
                        const subtaskMeta = getTaskTypeMeta(subtask.type);
                        const SubtaskIcon = subtaskMeta.icon;
                        return (
                          <label
                            key={subtask.id}
                            className="flex items-start gap-3 rounded-md border px-3 py-3 transition-colors hover:bg-muted/30"
                          >
                            <input
                              type="checkbox"
                              checked={subtask.status === "done"}
                              onChange={(e) => void handleToggleSubtask(subtask, e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-input"
                            />
                            <span
                              className={cn(
                                "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md",
                                subtaskMeta.indicatorClassName
                              )}
                            >
                              <SubtaskIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block text-sm font-medium text-[#222222]",
                                  subtask.status === "done" && "text-muted-foreground line-through"
                                )}
                              >
                                {subtask.title}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {subtask.status === "done" ? "เสร็จแล้ว" : "ยังไม่เสร็จ"}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <Label className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4" />
                    แนบไฟล์ (Attachments)
                  </Label>
                  <div
                    className={cn(
                      "mt-2 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground transition-colors",
                      "hover:border-primary/50 hover:bg-muted/30"
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-primary", "bg-primary/5");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                      if (e.dataTransfer.files?.length) handleUploadFiles(e.dataTransfer.files);
                    }}
                  >
                    <p className="mb-2">ลากไฟล์มาวางที่นี่ หรือคลิกเลือกไฟล์ (รูปภาพ, PDF, Doc)</p>
                    <Input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      disabled={uploading}
                      className="mx-auto max-w-xs cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files?.length) handleUploadFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    {uploading && <p className="mt-2 text-xs">กำลังอัปโหลด...</p>}
                    {uploadError && (
                      <div className="mt-2 text-xs" role="alert">
                        <p className="text-destructive">{uploadError}</p>
                        <p className="mt-1 text-muted-foreground">
                          ถ้าเป็น 400 หรือ Bucket not found: สร้าง bucket ชื่อ &quot;task-artifacts&quot; ใน Supabase → Storage → New bucket (Public)
                        </p>
                      </div>
                    )}
                  </div>
                  {attachments.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {attachments.map((att) => {
                        const Icon = getAttachmentIcon(att);
                        const isImage = att.file_type?.startsWith("image/");
                        return (
                          <li
                            key={att.id}
                            className="flex items-center gap-3 rounded-md border bg-background p-2"
                          >
                            {isImage ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImageUrl(att.file_url)}
                                className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-border object-cover hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <Image
                                  src={att.file_url}
                                  alt={att.file_name}
                                  fill
                                  className="object-cover"
                                  sizes="3rem"
                                  unoptimized
                                />
                              </button>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                <Icon className="w-6 h-6" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{att.file_name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {att.file_type ?? "—"}
                              </p>
                            </div>
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="shrink-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteAttachment(att)}
                              title="ลบไฟล์"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {previewImageUrl && (
                  <ImagePreviewModal
                    imageUrl={previewImageUrl}
                    onClose={() => setPreviewImageUrl(null)}
                  />
                )}
              </div>

              {/* ขวา 30%: Task Metadata */}
              <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                <div className="border-b pb-3">
                  <h3 className="text-sm font-semibold">ข้อมูล Task</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    จัดประเภท task, parent, tags และข้อมูลสถานะของงาน
                  </p>
                </div>
                <div>
                  <Label htmlFor="modal-type">Issue Type</Label>
                  <select
                    id="modal-type"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as TaskType)}
                    disabled={saving || deleting}
                    className={cn(
                      "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    {TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {getTaskTypeMeta(type).label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="modal-parent">Parent Task</Label>
                  <select
                    id="modal-parent"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    disabled={saving || deleting}
                    className={cn(
                      "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <option value="">— ไม่มี parent —</option>
                    {availableTasks.map((parentTask) => (
                      <option key={parentTask.id} value={parentTask.id}>
                        {parentTask.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="modal-epic">Epic</Label>
                  <select
                    id="modal-epic"
                    value={epicId}
                    onChange={(e) => setEpicId(e.target.value)}
                    disabled={saving || deleting}
                    className={cn(
                      "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <option value="">— ไม่มี Epic —</option>
                    {squadEpics.length > 0 && (
                      <optgroup label="Squad Epics">
                        {squadEpics.map((epic) => (
                          <option key={epic.id} value={epic.id}>
                            {epic.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {globalEpics.length > 0 && (
                      <optgroup label="Portfolio (Global)">
                        {globalEpics.map((epic) => (
                          <option key={epic.id} value={epic.id}>
                            {epic.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <Label htmlFor="modal-tags">Tags</Label>
                  <div className="mt-1 rounded-md border border-input bg-background px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
                            getTagClassName(tag)
                          )}
                        >
                          {tag}
                          <button
                            type="button"
                            className="text-current/80 hover:text-current"
                            onClick={() => handleRemoveTag(tag)}
                            aria-label={`ลบแท็ก ${tag}`}
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        id="modal-tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            handleAddTag(tagInput);
                          }
                          if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                            handleRemoveTag(tags[tags.length - 1]);
                          }
                        }}
                        onBlur={() => handleAddTag(tagInput)}
                        placeholder="พิมพ์แท็กแล้วกด Enter"
                        className="min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
                        disabled={saving || deleting}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="modal-status">สถานะ</Label>
                  <select
                    id="modal-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    disabled={saving || deleting}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="modal-priority">ความสำคัญ</Label>
                  <select
                    id="modal-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    disabled={saving || deleting}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="modal-assignee">ผู้รับผิดชอบ</Label>
                  <select
                    id="modal-assignee"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    disabled={saving || deleting}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <option value="">— ไม่ระบุ —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" form="task-form" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>
              กลับไปโหมดดู
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              ปิด
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto"
            >
              {deleting ? "กำลังลบ..." : "ลบ"}
            </Button>
          </div>
            </form>
          )}
          </div>
        </div>

        <AnimatePresence>
          {isActivityOpen && (
            <>
              {/* ชั้นเบลอพื้นหลังเฉพาะใน modal (ไม่ทับแผงแชทเพราะ z-index ต่ำกว่า) */}
              <motion.div
                className="absolute inset-0 z-30 bg-background/40 backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsActivityOpen(false)}
                aria-label="ปิดแผง Activity & Comments"
              />
              {/* แผง Activity & Comments ลอยอยู่ด้านบนสุดของ modal */}
              <motion.div
                className="absolute bottom-24 right-5 z-40 flex h-[72%] w-[min(460px,calc(100%-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_rgba(0,0,0,0.2)] ring-1 ring-black/5"
                initial={{ opacity: 0, y: 32, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              >
                <div className="flex items-center justify-between gap-3 border-b bg-muted/35 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Activity & Comments</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      พื้นที่พูดคุย อัปเดตงาน และเก็บ context ของ task
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setIsActivityOpen(false)}
                    title="ปิด"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                      {loadingComments ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          กำลังโหลดคอมเมนต์...
                        </p>
                      ) : comments.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          ยังไม่มีคอมเมนต์ — ส่งคำถาม คำตอบ หรืออัปเดตสถานะการทำงานได้ที่นี่
                        </p>
                      ) : (
                        comments.map((c) => {
                          const displayName = c.user?.name ?? c.author_name;
                          const avatarUrl = c.user?.avatar_url;
                          const initial = displayName.charAt(0).toUpperCase();
                          return (
                            <div
                              key={c.id}
                              className="flex gap-3 rounded-lg border bg-background p-3 text-left"
                            >
                              <div className="relative h-9 w-9 shrink-0">
                                {avatarUrl ? (
                                  <Image
                                    src={avatarUrl}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="h-9 w-9 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                                    {initial}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-sm font-medium">{displayName}</span>
                                  <time
                                    className="text-xs text-muted-foreground tabular-nums"
                                    dateTime={c.created_at}
                                  >
                                    {c.created_at
                                      ? new Date(c.created_at).toLocaleString("th-TH", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : ""}
                                  </time>
                                </div>
                                <MarkdownViewer value={c.content} className="mt-1 text-sm" />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <form
                    onSubmit={handleSendComment}
                    className="flex min-h-0 shrink-0 flex-col gap-3 border-t bg-muted/20 p-4"
                  >
                    <div className="shrink-0">
                      <p className="text-sm font-medium">เขียนคอมเมนต์ใหม่</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ใช้ toolbar แบบย่อสำหรับคุยกับทีมใน task นี้
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium"
                        aria-hidden
                      >
                        {currentUserName.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 max-w-[160px] truncate">{currentUserName}</span>
                    </div>
                    <div className="min-h-[80px] min-w-0 shrink-0">
                      <MarkdownEditor
                        value={newComment}
                        onChange={setNewComment}
                        placeholder="พิมพ์คอมเมนต์ด้วย Markdown เช่น **ตัวหนา**, - ลิสต์, [ลิงก์](https://...)"
                        className="min-h-0 min-w-0 bg-background"
                        compact
                        disabled={saving || loadingComments}
                        submitting={sendingComment}
                        onModEnter={() => void handleSendComment()}
                      />
                    </div>
                    <div className="flex shrink-0 justify-end">
                      <Button
                        type="submit"
                        variant="default"
                        disabled={sendingComment || !canSendComment}
                        title="ส่ง"
                        className="min-w-24 gap-2"
                      >
                        <Send className="h-4 w-4 shrink-0" />
                        ส่ง
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {!isActivityOpen && (
          <motion.button
            type="button"
            className="absolute bottom-[50px] right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#EE4D2D] text-white shadow-[0_16px_30px_rgba(238,77,45,0.38)]"
            onClick={() => setIsActivityOpen(true)}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            aria-label={`เปิด Activity & Comments (${comments.length})`}
            title="Activity & Comments"
          >
            <MessageCircle className="h-6 w-6" />
            {comments.length > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                {comments.length > 99 ? "99+" : comments.length}
              </span>
            )}
          </motion.button>
        )}
      </div>
      </div>
    </div>
  );
}
