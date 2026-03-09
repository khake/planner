import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";
import { ProjectEpicsSection } from "@/features/epics/ProjectEpicsSection";

export default async function ProjectSquadEpicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  return (
    <AppShell
      activeNav="squadEpics"
      sidebarVariant="squad"
      projectId={id}
      sidebarGroupTitle={project.name}
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: project.name, href: `/projects/${id}` },
        { label: "Squad Epics" },
      ]}
      topbarRight={<AppUserActions />}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-[#EE4D2D]">Squad Epics</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#222222]">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-2 text-sm leading-6 text-[#666666]">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E8E8E8] bg-white p-6">
          <ProjectEpicsSection projectId={id} />
        </section>
      </div>
    </AppShell>
  );
}

