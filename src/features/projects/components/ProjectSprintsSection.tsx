"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CreateSprintModal } from "@/features/sprints/CreateSprintModal";
import { useToast } from "@/contexts/ToastContext";

type SprintItem = {
  id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
};

type ProjectSprintsSectionProps = {
  projectId: string;
  initialSprints: SprintItem[];
};

export function ProjectSprintsSection({
  projectId,
  initialSprints,
}: ProjectSprintsSectionProps) {
  const [sprints, setSprints] = useState<SprintItem[]>(initialSprints);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { showToast } = useToast();

  const refetchSprints = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("sprints")
      .select("id, name, status, start_date, end_date")
      .eq("project_id", projectId)
      .order("start_date", { ascending: true });
    if (data) setSprints(data as SprintItem[]);
  }, [projectId]);

  const handleCreateSuccess = useCallback(() => {
    refetchSprints();
    showToast("สร้าง Sprint เรียบร้อยแล้ว");
  }, [refetchSprints, showToast]);

  const existingNames = sprints.map((s) => s.name);

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">สปรินต์</h2>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          สร้างสปรินต์
        </Button>
      </div>
      {sprints.length > 0 ? (
        <ul className="space-y-2">
          {sprints.map((s) => (
            <li
              key={s.id}
              className="card p-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  ({s.status})
                </span>
                {(s.start_date || s.end_date) && (
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {s.start_date && s.end_date
                      ? `${s.start_date} – ${s.end_date}`
                      : s.start_date || s.end_date}
                  </p>
                )}
              </div>
              <Link href={`/projects/${projectId}/board/${s.id}`}>
                <Button variant="brandOutline" size="sm">
                  View Board
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">ยังไม่มีสปรินต์</p>
          <Button onClick={() => setShowCreateModal(true)}>
            สร้างสปรินต์แรก
          </Button>
        </div>
      )}
      <CreateSprintModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId}
        existingSprintNames={existingNames}
        onSuccess={handleCreateSuccess}
      />
    </section>
  );
}
