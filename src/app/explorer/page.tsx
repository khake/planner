import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";
import { IssueExplorerClient } from "@/features/explorer/IssueExplorerClient";
import {
  parseTaskFilterFromSearchParams,
  parsePaginationFromSearchParams,
} from "@/lib/search-filter";
import { queryTasksForExplorer } from "@/lib/explorer-query";

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  if (typeof resolved === "object" && resolved !== null) {
    for (const [k, v] of Object.entries(resolved)) {
      if (v == null) continue;
      if (Array.isArray(v)) {
        v.forEach((val) => params.append(k, val));
      } else {
        params.set(k, v);
      }
    }
  }

  const filter = parseTaskFilterFromSearchParams(params);
  const pagination = parsePaginationFromSearchParams(params);

  const supabase = await createClient();

  const [tasksResult, projectsRes, usersRes, epicsRes] = await Promise.all([
    queryTasksForExplorer(supabase, filter, pagination),
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("profiles").select("id, name, avatar_url").order("name"),
    supabase.from("epics").select("id, title").order("title"),
  ]);

  const projects = (projectsRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? "",
  }));
  const users = (usersRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.name ?? "",
    avatar_url: u.avatar_url ?? null,
  }));
  const epics = (epicsRes.data ?? []).map((e) => ({
    id: e.id,
    title: e.title ?? "",
  }));

  return (
    <AppShell
      activeNav="squads"
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: "Issue Explorer" },
      ]}
      topbarRight={<AppUserActions />}
    >
      <IssueExplorerClient
        initialTasks={tasksResult.tasks}
        total={tasksResult.total}
        filter={filter}
        pagination={pagination}
        projects={projects}
        users={users}
        epics={epics}
      />
    </AppShell>
  );
}
