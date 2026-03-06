"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

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
    const { error } = await supabase.from("projects").insert({
      name: newName.trim(),
      description: newDescription.trim() || null,
    });
    setCreating(false);
    if (error) {
      console.error(error);
      return;
    }
    setShowCreateModal(false);
    setNewName("");
    setNewDescription("");
    await fetchProjects();
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
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)} variant="outline" size="sm">
          สร้าง Squad
        </Button>
      </div>
      {createModal}
      <ul className={cn("space-y-2")}>
      {projects.map((p) => (
        <li
          key={p.id}
          className="card p-4"
        >
          <h3 className="font-semibold text-[#222222]">{p.name}</h3>
          {p.description && (
            <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
          )}
          <Link
            href={`/projects/${p.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 inline-block")}
          >
            ดู Squad
          </Link>
        </li>
      ))}
      </ul>
    </div>
  );
}
