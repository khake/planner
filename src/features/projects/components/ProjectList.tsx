"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { ProjectSearchBar } from "./ProjectSearchBar";
import { parseProjectFilterFromSearchParams } from "@/lib/search-filter";

export function ProjectList() {
  const searchParams = useSearchParams();
  const filter = useMemo(
    () => parseProjectFilterFromSearchParams(searchParams),
    [searchParams]
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!filter.q.trim()) return projects;
    const q = filter.q.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [projects, filter.q]);

  const fetchProjects = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setProjects(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: newName.trim(),
        description: newDescription.trim() || null,
      })
      .select("*")
      .single();
    setCreating(false);
    if (error) {
      console.error(error);
      return;
    }
    setShowCreateModal(false);
    setNewName("");
    setNewDescription("");
    if (data) setProjects((prev) => [data as Project, ...prev]);
    else await fetchProjects();
  };

  if (loading) {
    return <p className="text-muted-foreground">กำลังโหลด...</p>;
  }

  const createModal = showCreateModal && (
    <Modal
      open={true}
      onClose={() => setShowCreateModal(false)}
      size="sm"
    >
      <h3 className="text-lg font-semibold mb-4">สร้าง Squad ใหม่</h3>
      <form onSubmit={handleCreateProject} className="space-y-4">
        <div>
          <Label htmlFor="project-name">ชื่อ Squad</Label>
          <Input
            id="project-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="เช่น My Project"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="project-desc">คำอธิบาย (ไม่บังคับ)</Label>
          <Input
            id="project-desc"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="อธิบาย Squad สั้นๆ"
            className="mt-1"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={creating}>
            {creating ? "กำลังสร้าง..." : "สร้าง Squad"}
          </Button>
        </div>
      </form>
    </Modal>
  );

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          ยังไม่มี Squad — สร้าง Squad แรกเพื่อเริ่มต้น
        </p>
        <Button onClick={() => setShowCreateModal(true)}>สร้าง Squad</Button>
        {createModal}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ProjectSearchBar />
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          สร้าง Squad
        </Button>
      </div>
      {createModal}
      {filteredProjects.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center">
          ไม่พบ Squad ที่ตรงกับคำค้นหา — ลองเปลี่ยนคำหรือล้างตัวกรอง
        </p>
      ) : (
      <ul className={cn("grid grid-cols-1 gap-4 xl:grid-cols-3 md:grid-cols-2")}>
      {filteredProjects.map((p) => (
        <li
          key={p.id}
          className="card flex min-h-[190px] flex-col justify-between p-5"
        >
          <div>
            <h3 className="text-lg font-semibold text-[#222222]">{p.name}</h3>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#666666]">
              {p.description ?? "ยังไม่มีคำอธิบายของ Squad นี้"}
            </p>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3">
            <span className="rounded-full bg-[#FAFAFA] px-3 py-1 text-xs font-medium text-[#666666]">
              Squad Workspace
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/projects/${p.id}/backlog`}
                className={cn(
                  buttonVariants({ variant: "brandOutline", size: "sm" }),
                  "inline-flex"
                )}
              >
                เปิด Backlog
              </Link>
              <Link
                href={`/projects/${p.id}/board`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "inline-flex"
                )}
              >
                Active Sprint
              </Link>
            </div>
          </div>
        </li>
      ))}
      </ul>
      )}
    </div>
  );
}
