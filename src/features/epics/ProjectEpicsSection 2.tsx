"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Epic } from "@/types";
import { fetchSquadEpics, createEpic, updateEpic, deleteEpic } from "@/lib/epic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/contexts/ToastContext";

type ProjectEpicsSectionProps = {
  projectId: string;
};

const EPIC_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function ProjectEpicsSection({ projectId }: ProjectEpicsSectionProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<string>("open");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();
  const { showToast } = useToast();

  const loadEpics = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchSquadEpics(supabase, projectId);
      setEpics(list);
    } catch {
      setEpics([]);
    }
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    loadEpics();
  }, [loadEpics]);

  const openCreate = useCallback(() => {
    setEditingEpic(null);
    setFormTitle("");
    setFormDescription("");
    setFormStatus("open");
    setShowModal(true);
  }, []);

  const openEdit = useCallback((epic: Epic) => {
    setEditingEpic(epic);
    setFormTitle(epic.title);
    setFormDescription(epic.description ?? "");
    setFormStatus(epic.status);
    setShowModal(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (editingEpic) {
        await updateEpic(supabase, editingEpic.id, {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          status: formStatus as Epic["status"],
        });
        showToast("อัปเดต Epic เรียบร้อยแล้ว");
      } else {
        await createEpic(supabase, {
          project_id: projectId,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          status: formStatus as Epic["status"],
          position: epics.length * 1024,
          start_date: null,
          end_date: null,
        });
        showToast("สร้าง Epic เรียบร้อยแล้ว");
      }
      setShowModal(false);
      loadEpics();
    } catch {
      showToast("เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  const handleDelete = async (epic: Epic) => {
    if (!confirm(`ลบ Epic "${epic.title}"? งานที่ผูกอยู่จะถูกปล่อยจาก Epic นี้`)) return;
    setDeletingId(epic.id);
    try {
      await deleteEpic(supabase, epic.id);
      showToast("ลบ Epic เรียบร้อยแล้ว");
      loadEpics();
    } catch {
      showToast("เกิดข้อผิดพลาด");
    }
    setDeletingId(null);
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Squad Epics</h2>
        <Button variant="outline" size="sm" onClick={openCreate}>
          สร้าง Epic
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
      ) : epics.length === 0 ? (
        <p className="text-muted-foreground text-sm">ยังไม่มี Epic — สร้าง Epic เพื่อจัดกลุ่มงานใน Squad นี้</p>
      ) : (
        <ul className="space-y-2">
          {epics.map((epic) => (
            <li
              key={epic.id}
              className="card p-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="font-medium">{epic.title}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  ({EPIC_STATUS_OPTIONS.find((s) => s.value === epic.status)?.label ?? epic.status})
                </span>
                {epic.description && (
                  <p className="text-muted-foreground text-sm mt-0.5 line-clamp-1">
                    {epic.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/epics/${epic.id}`}>
                  <Button variant="outline" size="sm">
                    ดูงาน
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(epic)}
                >
                  แก้ไข
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(epic)}
                  disabled={deletingId === epic.id}
                >
                  {deletingId === epic.id ? "กำลังลบ..." : "ลบ"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <Modal open={true} onClose={() => setShowModal(false)} size="sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingEpic ? "แก้ไข Epic" : "สร้าง Epic"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="epic-title">ชื่อ Epic</Label>
              <Input
                id="epic-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="เช่น รองรับ GPU ใน Cluster"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="epic-desc">คำอธิบาย (ไม่บังคับ)</Label>
              <Input
                id="epic-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="อธิบาย initiative สั้นๆ"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="epic-status">สถานะ</Label>
              <select
                id="epic-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {EPIC_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "กำลังบันทึก..." : editingEpic ? "บันทึก" : "สร้าง Epic"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
