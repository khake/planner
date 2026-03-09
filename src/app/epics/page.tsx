import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";
import { GlobalEpicsPage } from "@/features/epics/GlobalEpicsPage";

export default async function EpicsPage() {
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
