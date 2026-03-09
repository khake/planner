import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ProjectSprintsSection } from "@/features/projects/components/ProjectSprintsSection";
import { ProjectEpicsSection } from "@/features/epics/ProjectEpicsSection";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  const { data: sprints } = await supabase
    .from("sprints")
    .select("id, name, status, start_date, end_date")
    .eq("project_id", id)
    .order("start_date", { ascending: true });

  const initialSprints = (sprints ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    start_date: s.start_date ?? null,
    end_date: s.end_date ?? null,
  }));

  return (
    <AppShell
      activeNav="squads"
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: project.name },
      ]}
      topbarRight={<AppUserActions />}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-[#EE4D2D]">Project Workspace</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#222222]">{project.name}</h1>
              {project.description && (
                <p className="mt-2 text-sm leading-6 text-[#666666]">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${id}/backlog`}>
                <Button variant="brandOutline">Backlog</Button>
              </Link>
              <Link href={`/projects/${id}/board`}>
                <Button>Active Sprint</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E8E8E8] bg-white p-6">
          <ProjectSprintsSection projectId={id} initialSprints={initialSprints} />
        </section>

        <section className="rounded-xl border border-[#E8E8E8] bg-white p-6">
          <ProjectEpicsSection projectId={id} />
        </section>
      </div>
    </AppShell>
  );
}
