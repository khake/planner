"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Epic } from "@/types";
import { fetchGlobalEpics, createEpic, updateEpic, deleteEpic } from "@/lib/epic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/contexts/ToastContext";

const EPIC_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function GlobalEpicsPage() {
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
      const list = await fetchGlobalEpics(supabase);
      setEpics(list);
    } catch {
      setEpics([]);
    }
    setLoading(false);
  }, [supabase]);

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
          project_id: null,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          status: formStatus as Epic["status"],
          position: epics.length * 1024,
          start_date: null,
          end_date: null,
        });
        showToast("สร้าง Global Epic เรียบร้อยแล้ว");
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
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#EE4D2D]">Portfolio</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#222222]">Global Epics</h1>
            <p className="mt-2 text-sm text-[#666666]">
              Initiative ข้าม Squad — สร้าง Global Epic แล้วผูกงานจากหลาย Squad ได้จาก Task modal
            </p>
          </div>
          <Button onClick={openCreate}>สร้าง Global Epic</Button>
        </div>
      </section>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-6">
        {loading ? (
          <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
        ) : epics.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            ยังไม่มี Global Epic — สร้างเพื่อจัดกลุ่มงานข้าม Squad
          </p>
        ) : (
          <ul className="space-y-2">
            {epics.map((epic) => (
              <li
                key={epic.id}
                className="card p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <Link href={`/epics/${epic.id}`} className="font-medium hover:text-[#EE4D2D]">
                    {epic.title}
                  </Link>
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
                  <Button variant="outline" size="sm" onClick={() => openEdit(epic)}>
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
      </section>

      {showModal && (
        <Modal open={true} onClose={() => setShowModal(false)} size="sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingEpic ? "แก้ไข Global Epic" : "สร้าง Global Epic"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="global-epic-title">ชื่อ Epic</Label>
              <Input
                id="global-epic-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="เช่น ย้ายระบบไป Cloud"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="global-epic-desc">คำอธิบาย (ไม่บังคับ)</Label>
              <Input
                id="global-epic-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="อธิบาย initiative สั้นๆ"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="global-epic-status">สถานะ</Label>
              <select
                id="global-epic-status"
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
    </div>
  );
}
