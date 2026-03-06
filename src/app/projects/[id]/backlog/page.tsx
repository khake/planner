import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { DynamicBacklogBoard } from "@/features/backlog/components";
import { CurrentUserTag } from "@/components/current-user-tag";

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
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(`/login?from=/projects/${id}/backlog`);
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div />
        <div className="flex items-center gap-2">
          <CurrentUserTag />
        </div>
      </div>
      <DynamicBacklogBoard
        projectId={project.id}
        projectName={project.name}
        openCreateSprint={openCreateSprint}
      />
    </main>
  );
}
