import { Building2, Layers, Search } from "lucide-react";

/**
 * คีย์สำหรับไฮไลต์เมนูที่ active
 */
export type SidebarKey =
  | "squads"
  | "squadBacklog"
  | "squadSprints"
  | "squadEpics"
  | "portfolio"
  | "searchIssues";

/**
 * โหมดเมนูด้านซ้าย
 * - projects: หน้า /projects (รายการ Squads) — ไม่มี Global Epics
 * - squad: หน้าที่อยู่ภายใต้ Squad เดียว /projects/[id]/* — แสดง Squad Epics แทน Global Epics
 * - global: หน้า Epics, Search Issues, Profile — แสดง Global Epics
 */
export type SidebarVariant = "projects" | "squad" | "global";

export type SidebarItem = {
  key: SidebarKey;
  label: string;
  href: string;
  icon: typeof Building2;
  helper: string;
};

/** เมนูสำหรับหน้า Projects (/projects) */
const sidebarProjects: SidebarItem[] = [
  {
    key: "squads",
    label: "Squads",
    href: "/projects",
    icon: Building2,
    helper: "รายการ/สถานะงานของแต่ละทีม",
  },
  {
    key: "searchIssues",
    label: "Search Issues",
    href: "/explorer",
    icon: Search,
    helper: "ค้นหางานข้าม Squad",
  },
];

/** เมนูสำหรับหน้าภายใน Squad (/projects/[id]/*) — มี Squad Epics */
function getSidebarSquad(projectId: string): SidebarItem[] {
  return [
    {
      key: "squads",
      label: "Squads",
      href: "/projects",
      icon: Building2,
      helper: "รายการ/สถานะงานของแต่ละทีม",
    },
    {
      key: "squadBacklog",
      label: "Backlogs",
      href: `/projects/${projectId}/backlog`,
      icon: Layers,
      helper: "ดู Backlog ของ Squad นี้",
    },
    {
      key: "squadSprints",
      label: "Sprints",
      href: `/projects/${projectId}`,
      icon: Layers,
      helper: "ดูสปรินต์และบอร์ดของ Squad นี้",
    },
    {
      key: "squadEpics",
      label: "Epics",
      href: `/projects/${projectId}/epics`,
      icon: Layers,
      helper: "Epics ของ Squad นี้",
    },
    {
      key: "searchIssues",
      label: "Search Issues",
      href: "/explorer",
      icon: Search,
      helper: "ค้นหางานข้าม Squad",
    },
  ];
}

/** เมนูสำหรับหน้า Global (Epics, Search Issues, Profile) — มี Global Epics */
const sidebarGlobal: SidebarItem[] = [
  {
    key: "squads",
    label: "Squads",
    href: "/projects",
    icon: Building2,
    helper: "รายการ/สถานะงานของแต่ละทีม",
  },
  {
    key: "portfolio",
    label: "Global Epics",
    href: "/epics",
    icon: Layers,
    helper: "Global Epics ข้าม Squad",
  },
  {
    key: "searchIssues",
    label: "Search Issues",
    href: "/explorer",
    icon: Search,
    helper: "ค้นหางานข้าม Squad",
  },
];

/**
 * ดึงรายการเมนูด้านซ้ายตาม variant และ (ถ้าเป็น squad) projectId
 */
export function getSidebarItems(
  variant: SidebarVariant,
  projectId?: string
): SidebarItem[] {
  switch (variant) {
    case "projects":
      return sidebarProjects;
    case "squad":
      return getSidebarSquad(projectId ?? "");
    case "global":
    default:
      return sidebarGlobal;
  }
}
