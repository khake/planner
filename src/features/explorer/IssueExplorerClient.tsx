"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TaskFilterBar } from "@/features/board/components";
import {
  hasTaskFilters,
  PAGE_SIZE_OPTIONS,
  type TaskFilterState,
  type PaginationState,
} from "@/lib/search-filter";
import { getTaskTypeMeta } from "@/lib/task-ui";
import { Button } from "@/components/ui/button";
import type { TaskRow } from "@/lib/explorer-query";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export type IssueExplorerClientProps = {
  initialTasks: TaskRow[];
  total: number;
  filter: TaskFilterState;
  pagination: PaginationState;
  projects: { id: string; name: string }[];
  users: { id: string; name: string; avatar_url: string | null }[];
  epics: { id: string; title: string }[];
};

export function IssueExplorerClient({
  initialTasks,
  total,
  filter,
  pagination,
  projects,
  users,
  epics,
}: IssueExplorerClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const setPage = useCallback(
    (page: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("page", String(Math.max(1, page)));
      router.replace(`${pathname}?${p.toString()}`, { scroll: true });
    },
    [pathname, router, searchParams]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("pageSize", String(pageSize));
      p.set("page", "1");
      router.replace(`${pathname}?${p.toString()}`, { scroll: true });
    },
    [pathname, router, searchParams]
  );

  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const from = total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const to = Math.min(pagination.page * pagination.pageSize, total);

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
        <p className="text-sm font-medium text-[#EE4D2D]">Global search</p>
        <h1 className="mt-1 text-3xl font-semibold text-[#222222]">
          Search Issues
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#666666]">
          ค้นหาและกรองงานข้าม Squad ด้วย keyword, สถานะ, ความสำคัญ, ประเภท,
          ผู้รับผิดชอบ, Epic และลิงก์แชร์ได้
        </p>
      </section>

      <TaskFilterBar
        users={users}
        projects={projects}
        epics={epics}
        showSquadFilter
        preservePageSizeOnFilter
      />

      <div className="rounded-xl border border-[#E8E8E8] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#FAFAFA]">
                <th className="text-left px-4 py-3 font-medium text-[#666666]">
                  Key
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#666666]">
                  ชื่องาน
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#666666]">
                  สถานะ
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#666666]">
                  ความสำคัญ
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#666666]">
                  ประเภท
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#666666]">
                  ผู้รับผิดชอบ
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#666666]">
                  Squad
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {initialTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {hasTaskFilters(filter) ? (
                      "ไม่พบงานที่ตรงกับตัวกรอง — ลองเปลี่ยนตัวกรองหรือล้าง"
                    ) : (
                      "ยังไม่มีงานในระบบ หรือไม่มีสิทธิ์ดู"
                    )}
                  </td>
                </tr>
              ) : (
                initialTasks.map((task) => {
                  const typeMeta = getTaskTypeMeta(task.type as "story" | "task" | "bug" | "subtask");
                  const assignee = task.assignee_id
                    ? userById[task.assignee_id]
                    : null;
                  const projectName =
                    task.projects?.name ?? task.project_id;
                  return (
                    <tr
                      key={task.id}
                      className="border-b border-[#E8E8E8] hover:bg-muted/30"
                    >
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {task.ticket_key}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/tickets/${encodeURIComponent(task.ticket_key)}`}
                          className="font-medium text-[#222222] hover:text-primary hover:underline"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            task.status === "done" && "bg-muted text-muted-foreground",
                            task.status === "in_progress" && "bg-primary/15 text-primary",
                            task.status === "review" && "bg-amber-100 text-amber-800",
                            task.status === "backlog" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {task.priority}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                            typeMeta.indicatorClassName
                          )}
                        >
                          <typeMeta.icon className="h-3.5 w-3.5" />
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {assignee?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {projectName}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/tickets/${encodeURIComponent(task.ticket_key)}`}
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          title="เปิดงาน"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E8E8E8] px-4 py-3 bg-[#FAFAFA]">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              แสดง {from}–{to} จาก {total} รายการ
            </span>
            <label className="flex items-center gap-2">
              <span>ต่อหน้า</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
            >
              ก่อนหน้า
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              หน้า {pagination.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= totalPages}
              onClick={() => setPage(pagination.page + 1)}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
