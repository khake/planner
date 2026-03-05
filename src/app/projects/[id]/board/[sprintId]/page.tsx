import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { KanbanBoard } from "@/features/board/components";
import { Button } from "@/components/ui/button";

export default async function SprintBoardPage({
  params,
}: {
  params: Promise<{ id: string; sprintId: string }>;
}) {
  const { id: projectId, sprintId } = await params;
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (projectError || !project) notFound();

  const { data: sprint, error: sprintError } = await supabase
    .from("sprints")
    .select("id, name, status, start_date, end_date, goal")
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .single();

  if (sprintError || !sprint) notFound();

  const isActiveSprint = sprint.status === "active";
  const pageTitle = isActiveSprint
    ? `Active Sprint Board — ${project.name}`
    : `${sprint.name} — ${project.name}`;

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
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
      <h1 className="text-2xl font-bold mb-4">
        {pageTitle}
      </h1>
      <KanbanBoard
        projectId={project.id}
        projectName={project.name}
        sprintId={sprint.id}
        sprintName={sprint.name}
        sprintStartDate={sprint.start_date ?? undefined}
        sprintEndDate={sprint.end_date ?? undefined}
        sprintStatus={sprint.status}
        sprintGoal={sprint.goal ?? undefined}
        isActiveSprint={sprint.status === "active"}
      />
    </main>
  );
}
