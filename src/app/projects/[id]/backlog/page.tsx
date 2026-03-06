import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DynamicBacklogBoard } from "@/features/backlog/components";

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
    <main className="container mx-auto py-8 px-4">
      <DynamicBacklogBoard
        projectId={project.id}
        projectName={project.name}
        openCreateSprint={openCreateSprint}
      />
    </main>
  );
}
