import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";
import { TicketDetailPage } from "@/features/board/components/TicketDetailPage";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketKey: string }>;
}) {
  const { ticketKey } = await params;
  const supabase = await createClient();

  const decodedKey = decodeURIComponent(ticketKey);
  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("ticket_key", decodedKey)
    .single();

  if (error || !task) notFound();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, avatar_url")
    .order("name");

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? "",
    avatar_url: p.avatar_url ?? null,
  }));

  return (
    <AppShell
      activeNav="squads"
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: task.ticket_key ?? decodedKey, href: `/tickets/${ticketKey}` },
      ]}
      topbarRight={<AppUserActions />}
    >
      <TicketDetailPage task={task} users={users} />
    </AppShell>
  );
}
