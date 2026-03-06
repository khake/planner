import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { DynamicKanbanBoard } from "@/features/board/components";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect(`/login?from=/projects/${projectId}/board`);
  }

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
    <AppShell
      activeNav="squads"
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: "Active Sprint" },
      ]}
      topbarRight={<AppUserActions />}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#EE4D2D]">Sprint Board</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#222222]">
                Active Sprint Board
              </h1>
              <p className="mt-2 text-sm text-[#666666]">{project.name}</p>
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

        {!activeSprint ? (
          <div className="rounded-xl border border-[#E8E8E8] bg-white p-8 text-center">
            <p className="mb-3 text-base font-medium text-[#222222]">
              ไม่มี Active Sprint ใน Squad นี้
            </p>
            <p className="mb-5 text-sm text-[#666666]">
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
      </div>
    </AppShell>
  );
}
