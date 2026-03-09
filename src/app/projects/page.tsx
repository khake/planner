import Link from "next/link";
import { Suspense } from "react";
import { ProjectList } from "@/features/projects/components";
import { AppShell } from "@/components/app-shell";
import { AppUserActions } from "@/components/app-user-actions";
import { Button } from "@/components/ui/button";

export default async function ProjectsPage() {
  return (
    <AppShell
      activeNav="squads"
      sidebarVariant="projects"
      breadcrumbs={[
        { label: "หน้าแรก", href: "/" },
        { label: "Squads" },
      ]}
      topbarRight={<AppUserActions />}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#EE4D2D]">Team Overview</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#222222]">Squads</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#666666]">
                มุมมองรวมของทีมและโปรเจกต์ทั้งหมดในระบบ เลือก Squad เพื่อเข้าไปดู backlog,
                sprint และ board ได้ทันที
              </p>
            </div>
            <Link href="/explorer">
              <Button variant="brandOutline" size="sm">
                Search Issues
              </Button>
            </Link>
          </div>
        </section>
        <Suspense fallback={<p className="text-muted-foreground">กำลังโหลด...</p>}>
          <ProjectList />
        </Suspense>
      </div>
    </AppShell>
  );
}
