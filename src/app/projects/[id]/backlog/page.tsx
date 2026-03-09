import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DynamicBacklogBoard } from "@/features/backlog/components";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";

export default async function BacklogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolved = await searchParams;
  const openCreateSprint = resolved?.createSprint === "1";
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  return (
    <AppShell
      activeNav="squads"
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: "Backlog" },
      ]}
      topbarRight={<AppUserActions />}
    >
      <DynamicBacklogBoard
        projectId={project.id}
        projectName={project.name}
        openCreateSprint={openCreateSprint}
      />
    </AppShell>
  );
}
