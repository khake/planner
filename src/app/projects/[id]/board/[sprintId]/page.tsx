import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DynamicKanbanBoard } from "@/features/board/components";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";

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
    <AppShell
      activeNav="squadSprints"
      sidebarVariant="squad"
      projectId={projectId}
      sidebarGroupTitle={project.name}
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: sprint.name },
      ]}
      topbarRight={<AppUserActions />}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#EE4D2D]">Sprint Board</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#222222]">{pageTitle}</h1>
              {sprint.goal && (
                <p className="mt-2 max-w-2xl text-sm text-[#666666]">{sprint.goal}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${projectId}/backlog`}>
                <Button variant="brandOutline">Backlog</Button>
              </Link>
              <Link href={`/projects/${projectId}/board`}>
                <Button>Active Sprint</Button>
              </Link>
            </div>
          </div>
        </section>

        <DynamicKanbanBoard
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
      </div>
    </AppShell>
  );
}
