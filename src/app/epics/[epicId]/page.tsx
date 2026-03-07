import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";
import { Button } from "@/components/ui/button";

export default async function EpicDetailPage({
  params,
}: {
  params: Promise<{ epicId: string }>;
}) {
  const { epicId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(`/login?from=/epics/${epicId}`);
  }

  const { data: epic, error: epicError } = await supabase
    .from("epics")
    .select("*")
    .eq("id", epicId)
    .single();

  if (epicError || !epic) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, ticket_key, project_id, projects(name)")
    .eq("epic_id", epicId)
    .order("position", { ascending: true });

  type TaskRow = { id: string; title: string; status: string; ticket_key: string | null; project_id: string; project_name: string | null };
  const taskList: TaskRow[] = (tasks ?? []).map((t: Record<string, unknown> & { projects?: { name: string } | { name: string }[] | null }) => {
    const proj = t.projects;
    const name = Array.isArray(proj) ? proj[0]?.name : proj?.name;
    return {
      id: String(t.id),
      title: String(t.title),
      status: String(t.status),
      ticket_key: t.ticket_key != null ? String(t.ticket_key) : null,
      project_id: String(t.project_id),
      project_name: (name as string) ?? null,
    };
  });

  const isGlobal = epic.project_id == null;

  return (
    <AppShell
      activeNav={isGlobal ? "portfolio" : "squads"}
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        ...(isGlobal
          ? [{ label: "Portfolio", href: "/epics" }]
          : []),
        { label: epic.title },
      ]}
      topbarRight={<AppUserActions />}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-[#EE4D2D]">
                {isGlobal ? "Global Epic" : "Squad Epic"}
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-[#222222]">{epic.title}</h1>
              {epic.description && (
                <p className="mt-2 text-sm text-[#666666]">{epic.description}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">สถานะ: {epic.status}</p>
            </div>
            {isGlobal && (
              <Link href="/epics">
                <Button variant="outline">กลับไป Portfolio</Button>
              </Link>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#E8E8E8] bg-white p-6">
          <h2 className="text-lg font-semibold mb-3">งานใน Epic นี้</h2>
          {taskList.length === 0 ? (
            <p className="text-muted-foreground text-sm">ยังไม่มีงานผูกกับ Epic นี้</p>
          ) : (
            <ul className="space-y-2">
              {taskList.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={task.ticket_key ? `/tickets/${encodeURIComponent(task.ticket_key)}` : "#"}
                      className="font-medium hover:text-[#EE4D2D] truncate block"
                    >
                      {task.ticket_key && (
                        <span className="text-muted-foreground font-mono text-sm mr-2">
                          {task.ticket_key}
                        </span>
                      )}
                      {task.title}
                    </Link>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{task.status}</span>
                      {task.project_name && (
                        <span>— {task.project_name}</span>
                      )}
                    </div>
                  </div>
                  {task.ticket_key && (
                    <Link href={`/tickets/${encodeURIComponent(task.ticket_key)}`}>
                      <Button variant="outline" size="sm">
                        เปิด
                      </Button>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
