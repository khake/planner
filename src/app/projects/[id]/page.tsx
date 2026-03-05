import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProjectSprintsSection } from "@/features/projects/components/ProjectSprintsSection";

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
    <main className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/projects">
          <Button variant="outline">← Squads</Button>
        </Link>
        <Link href={`/projects/${id}/backlog`}>
          <Button variant="outline">Backlog</Button>
        </Link>
        <Link href={`/projects/${id}/board`}>
          <Button>Active Sprint</Button>
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
      {project.description && (
        <p className="text-muted-foreground mb-6">{project.description}</p>
      )}
      <ProjectSprintsSection projectId={id} initialSprints={initialSprints} />
    </main>
  );
}
