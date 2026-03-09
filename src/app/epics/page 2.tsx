import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";
import { GlobalEpicsPage } from "@/features/epics/GlobalEpicsPage";

export default async function EpicsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?from=/epics");
  }

  return (
    <AppShell
      activeNav="portfolio"
      sidebarVariant="global"
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: "Global Epics" },
      ]}
      topbarRight={<AppUserActions />}
    >
      <GlobalEpicsPage />
    </AppShell>
  );
}
