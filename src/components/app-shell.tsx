import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarKey = "squads" | "settings";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AppShellProps = {
  activeNav: SidebarKey;
  breadcrumbs: BreadcrumbItem[];
  topbarRight?: ReactNode;
  children: ReactNode;
};

const navItems: {
  key: SidebarKey;
  label: string;
  href: string;
  icon: typeof Building2;
  helper: string;
}[] = [
  {
    key: "squads",
    label: "ภาพรวมทีม",
    href: "/projects",
    icon: Building2,
    helper: "ดู Squad และสถานะงาน",
  },
  {
    key: "settings",
    label: "การตั้งค่า",
    href: "/profile",
    icon: Settings2,
    helper: "โปรไฟล์และความปลอดภัย",
  },
];

export function AppShell({
  activeNav,
  breadcrumbs,
  topbarRight,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#222222]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#E8E8E8] bg-[#FAFAFA] lg:flex lg:flex-col">
          <div className="border-b border-[#E8E8E8] px-6 py-6">
            <Link href="/projects" className="block">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#EE4D2D]">
                Planner
              </p>
              <h1 className="mt-2 text-xl font-semibold text-[#222222]">
                Team Workspace
              </h1>
              <p className="mt-1 text-sm text-[#666666]">
                Shopee-style planning board สำหรับงานของทีม
              </p>
            </Link>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeNav;
              return (
                <Link
                  key={item.key}
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
              );
            })}
          </nav>
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

          <main className="px-5 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
