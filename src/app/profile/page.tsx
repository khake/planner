import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";
import { ProfilePageClient } from "@/features/profile/components/profile-page-client";

export default function ProfilePage() {
  return (
    <AppShell
      activeNav="squads"
      sidebarVariant="global"
      breadcrumbs={[
        { label: "Squads", href: "/projects" },
        { label: "การตั้งค่า" },
      ]}
      topbarRight={<AppUserActions />}
    >
      <ProfilePageClient />
    </AppShell>
  );
}

