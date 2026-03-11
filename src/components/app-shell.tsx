import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BuildInfo } from "@/components/build-info";
import {
  getSidebarItems,
  type SidebarKey,
  type SidebarVariant,
} from "@/config/sidebar";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type { SidebarKey, SidebarVariant };

type AppShellProps = {
  /** คีย์เมนูที่ active (ใช้ไฮไลต์) */
  activeNav: SidebarKey;
  /** โหมดเมนู: projects = หน้า /projects, squad = หน้า Squad, global = Epics/Search/Profile */
  sidebarVariant: SidebarVariant;
  /** ใช้เมื่อ sidebarVariant === "squad" เพื่อให้ลิงก์ Squad Epics ไป /projects/[id] */
  projectId?: string;
  /** ชื่อ Squad/โปรเจ็กต์ปัจจุบัน (ใช้เป็นหัวข้อกลุ่มเมนูใน sidebar สำหรับ squad) */
  sidebarGroupTitle?: string;
  breadcrumbs: BreadcrumbItem[];
  topbarRight?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  activeNav,
  sidebarVariant,
  projectId,
  sidebarGroupTitle,
  breadcrumbs,
  topbarRight,
  children,
}: AppShellProps) {
  const navItems = getSidebarItems(sidebarVariant, projectId);
  const isSquadSidebar = sidebarVariant === "squad";

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#222222]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#E8E8E8] bg-[#FAFAFA] lg:flex lg:flex-col">
          <div className="border-b border-[#E8E8E8] px-6 py-6">
            <Link href="/projects" className="block">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#EE4D2D]">
                Tracking
              </p>
              <h1 className="mt-2 text-xl font-semibold text-[#222222]">
                Team Workspace
              </h1>
              <p className="mt-1 text-sm text-[#666666]">
                แทร็คกิ้ง board สำหรับงานของทีม
              </p>
            </Link>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-5">
            {(() => {
              let orderHeaderRendered = false;
              return navItems.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeNav;
                const isOrderItem =
                  isSquadSidebar &&
                  (item.key === "squadBacklog" ||
                    item.key === "squadSprints" ||
                    item.key === "squadEpics");
                const shouldRenderOrderHeader = isOrderItem && !orderHeaderRendered;
                if (shouldRenderOrderHeader) {
                  orderHeaderRendered = true;
                }

                return (
                  <div key={item.key} className="space-y-1">
                    {shouldRenderOrderHeader && (
                      <p className="px-1 text-xs font-semibold text-[#424242]">
                        {sidebarGroupTitle ?? "Current Squad"}
                      </p>
                    )}
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-start gap-3 rounded-md border px-4 py-3 transition-colors",
                        active
                          ? "border-[#EE4D2D]/20 bg-[#FFF3F0] text-[#EE4D2D]"
                          : "border-transparent text-[#444444] hover:border-[#E8E8E8] hover:bg-white"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md",
                          active ? "bg-[#EE4D2D] text-white" : "bg-white text-[#666666]"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-[#666666]">
                          {item.helper}
                        </span>
                      </span>
                    </Link>
                  </div>
                );
              });
            })()}
          </nav>
          <div className="border-t border-[#E8E8E8] px-4 py-4">
            <BuildInfo />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-[#E8E8E8] bg-[#F5F5F5]/95 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
              <nav
                aria-label="Breadcrumb"
                className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[#666666]"
              >
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <span key={`${item.label}-${index}`} className="flex items-center gap-2">
                      {item.href && !isLast ? (
                        <Link href={item.href} className="transition-colors hover:text-[#EE4D2D]">
                          {item.label}
                        </Link>
                      ) : (
                        <span className={cn(isLast && "font-semibold text-[#222222]")}>
                          {item.label}
                        </span>
                      )}
                      {!isLast && <span className="text-[#BDBDBD]">/</span>}
                    </span>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2">{topbarRight}</div>
            </div>
          </header>

          <main className="px-5 py-6 lg:px-8 lg:py-8">
            {children}
            <div className="mt-8 lg:hidden">
              <BuildInfo compact />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
