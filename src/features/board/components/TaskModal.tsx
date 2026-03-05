"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaskStatus, TaskPriority } from "@/types";
import type { TaskWithAssignee, Attachment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Paperclip, Download, Trash2, Image, FileText, File, X, Maximize2, MessageSquare, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TaskComment, TaskCommentWithUser } from "@/types";

const BUCKET = "task-artifacts";

function getAttachmentIcon(att: { file_type: string | null }): LucideIcon {
  if (att.file_type?.startsWith("image/")) return Image;
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
        className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="max-h-[85vh] max-w-full object-contain"
        />
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

const STATUS_OPTIONS: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];

type TaskModalProps = {
  task: TaskWithAssignee;
  users: { id: string; name: string; avatar_url: string | null }[];
  sprintId: string;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export function TaskModal({
  task,
  users,
  onClose,
  onSaved,
  onDeleted,
}: TaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(task.assignee_id ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<TaskCommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentAuthorId, setCommentAuthorId] = useState<string>(task.assignee_id ?? users[0]?.id ?? "");
  const [sendingComment, setSendingComment] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  const loadAttachments = useCallback(async () => {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    setAttachments(data ?? []);
  }, [task.id, supabase]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("task_comments")
      .select("*, user:users!author_id(id, name, avatar_url)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });
    setComments((data ?? []) as TaskCommentWithUser[]);
  }, [task.id, supabase]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSendComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    const author = users.find((u) => u.id === commentAuthorId);
    const authorName = author?.name ?? "ผู้ใช้";
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: TaskCommentWithUser = {
      id: tempId,
      task_id: task.id,
      author_name: authorName,
      author_id: commentAuthorId || null,
      content,
      created_at: new Date().toISOString(),
      user: author ? { id: author.id, name: author.name, avatar_url: author.avatar_url } : null,
    };
    setComments((prev) => [optimisticComment, ...prev]);
    setNewComment("");
    if (commentInputRef.current) {
      commentInputRef.current.style.height = "auto";
    }
    const { error } = await supabase.from("task_comments").insert({
      task_id: task.id,
      author_name: authorName,
      author_id: commentAuthorId || null,
      content,
    });
    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      return;
    }
    loadComments();
  };

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
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
    const { error } = await supabase
      .from("tasks")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assignee_id: assigneeId || null,
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
          "w-[90vw] max-w-6xl h-[90vh] rounded-lg border bg-background shadow-xl flex flex-col overflow-hidden"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-semibold mb-4">รายละเอียดงาน</h2>
          <form id="task-form" onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
              {/* ซ้าย 70%: Description / Requirement + Attachments */}
              <div className="min-w-0 space-y-4">
                <div>
                  <Label htmlFor="modal-title">ชื่องาน</Label>
                  <Input
                    id="modal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="modal-desc">รายละเอียด / Requirement</Label>
                  <textarea
                    id="modal-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={12}
                    placeholder="พิมพ์ requirement, หมายเหตุ หรือรายละเอียดงาน..."
                    className={cn(
                      "flex w-full min-h-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1 resize-y"
                    )}
                  />
                </div>
                <div>
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
                className="max-w-xs mx-auto cursor-pointer"
                onChange={(e) => {
                  if (e.target.files?.length) handleUploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {uploading && <p className="mt-2 text-xs">กำลังอัปโหลด...</p>}
              {uploadError && (
                <div className="mt-2 text-xs" role="alert">
                  <p className="text-destructive">{uploadError}</p>
                  <p className="text-muted-foreground mt-1">
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
                      className="flex items-center gap-3 rounded-md border bg-muted/30 p-2"
                    >
                      {isImage ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(att.file_url)}
                          className="h-12 w-12 rounded object-cover shrink-0 overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <img
                            src={att.file_url}
                            alt={att.file_name}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                          <Icon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.file_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
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

            {previewImageUrl && (
              <ImagePreviewModal
                imageUrl={previewImageUrl}
                onClose={() => setPreviewImageUrl(null)}
              />
            )}
                </div>
              </div>

              {/* ขวา 30%: Task Metadata */}
              <div className="space-y-4 lg:border-l lg:pl-6">
                <div>
                  <Label htmlFor="modal-status">สถานะ</Label>
                  <select
                    id="modal-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
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
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
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
        </div>

        {/* Activity / Comments (Feed เรียงใหม่ไปเก่า) */}
        <div className="border-t bg-muted/20 flex flex-col min-h-0 shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Activity / Comments</span>
          </div>
          <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto p-3 space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
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
                    className="flex gap-3 rounded-lg bg-background border p-3 text-left"
                  >
                    <div className="shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                          {initial}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
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
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">
                        {c.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={handleSendComment} className="p-3 border-t bg-background flex gap-2 items-end">
            <select
              value={commentAuthorId}
              onChange={(e) => setCommentAuthorId(e.target.value)}
              className={cn(
                "flex h-9 w-32 rounded-md border border-input bg-background px-2 text-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              title="แสดงชื่อเป็น"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <textarea
              ref={commentInputRef}
              value={newComment}
              onChange={handleCommentInputChange}
              placeholder="พิมพ์คอมเมนต์... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
              rows={1}
              className={cn(
                "flex-1 min-w-0 min-h-[40px] max-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none overflow-y-auto"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
            />
            <Button type="submit" size="icon" disabled={sendingComment || !newComment.trim()} title="ส่ง">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
