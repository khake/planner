import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DynamicKanbanBoard } from "@/features/board/components";
import { Button } from "@/components/ui/button";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (projectError || !project) notFound();

  const { data: activeSprint } = await supabase
    .from("sprints")
    .select("id, name, status, start_date, end_date, goal")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="outline">← Squads</Button>
          </Link>
          <Link href={`/projects/${projectId}/backlog`}>
            <Button variant="outline">Backlog</Button>
          </Link>
          <Link href={`/projects/${projectId}/board`}>
            <Button>Active Sprint</Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profile">
            <Button variant="outline" size="sm">
              โปรไฟล์
            </Button>
          </Link>
          <Link href="/logout">
            <Button variant="ghost" size="sm">
              Logout
            </Button>
          </Link>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4">
        Active Sprint Board — {project.name}
      </h1>

      {!activeSprint ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center">
          <p className="text-muted-foreground mb-4">
            ไม่มี Active Sprint ใน Squad นี้
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            ไปที่ Backlog สร้าง Sprint แล้วกด Start Sprint
          </p>
          <Link href={`/projects/${projectId}/backlog`}>
            <Button>ไปที่ Backlog</Button>
          </Link>
        </div>
      ) : (
        <DynamicKanbanBoard
          projectId={project.id}
          projectName={project.name}
          sprintId={activeSprint.id}
          sprintName={activeSprint.name}
          sprintStartDate={activeSprint.start_date ?? undefined}
          sprintEndDate={activeSprint.end_date ?? undefined}
          sprintStatus={activeSprint.status}
          sprintGoal={activeSprint.goal ?? undefined}
          isActiveSprint={activeSprint.status === "active"}
        />
      )}
    </main>
  );
}
