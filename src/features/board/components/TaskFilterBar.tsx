"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  parseTaskFilterFromSearchParams,
  taskFilterToSearchParams,
  hasTaskFilters,
  defaultTaskFilter,
  PAGINATION_PARAMS,
  DEFAULT_PAGE_SIZE,
  type TaskFilterState,
} from "@/lib/search-filter";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { getTaskTypeMeta } from "@/lib/task-ui";
import type { TaskStatus, TaskPriority, TaskType } from "@/types";
import { Search, X } from "lucide-react";

/** Debounce for text search to limit URL updates and server requests */
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: TaskStatus[] = ["backlog", "todo", "in_progress", "review", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];
const TYPE_OPTIONS: TaskType[] = ["story", "task", "bug", "subtask"];

type SprintOption = { id: string; name: string };
type EpicOption = { id: string; title: string };
type ProjectOption = { id: string; name: string };

export type TaskFilterBarProps = {
  users: { id: string; name: string; avatar_url: string | null }[];
  sprints?: SprintOption[];
  epics?: EpicOption[];
  projects?: ProjectOption[];
  showSprintFilter?: boolean;
  showSquadFilter?: boolean;
  /** When true, appends page=1 and current pageSize to URL on filter change (e.g. for Search Issues). */
  preservePageSizeOnFilter?: boolean;
};

export function TaskFilterBar({
  users,
  sprints = [],
  epics = [],
  projects = [],
  showSprintFilter = false,
  showSquadFilter = false,
  preservePageSizeOnFilter = false,
}: TaskFilterBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseTaskFilterFromSearchParams(searchParams);
  const [inputValue, setInputValue] = useState(filter.q);

  const applyFilter = useCallback(
    (next: TaskFilterState) => {
      const params = taskFilterToSearchParams(next);
      if (preservePageSizeOnFilter) {
        params.set(PAGINATION_PARAMS.page, "1");
        params.set(
          PAGINATION_PARAMS.pageSize,
          searchParams.get(PAGINATION_PARAMS.pageSize) ?? String(DEFAULT_PAGE_SIZE)
        );
      }
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router, preservePageSizeOnFilter, searchParams]
  );

  const debouncedApply = useDebouncedCallback(applyFilter, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setInputValue(filter.q);
  }, [filter.q]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    debouncedApply({ ...filter, q: v });
  };

  const handleSelectChange = (key: keyof TaskFilterState, value: string) => {
    applyFilter({ ...filter, [key]: value });
  };

  const handleReset = () => {
    setInputValue("");
    applyFilter(defaultTaskFilter);
  };

  const hasActive = hasTaskFilters({ ...filter, q: inputValue });

  const selectClass =
    "h-9 min-w-0 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E8E8E8] bg-white px-4 py-3">
      <div className="relative flex-1 min-w-[140px] max-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="คำค้นหา / ticket key..."
          value={inputValue}
          onChange={handleQueryChange}
          className={selectClass + " pl-8"}
          aria-label="ค้นหางาน"
        />
      </div>
      <select
        aria-label="สถานะ"
        value={filter.status}
        onChange={(e) => handleSelectChange("status", e.target.value)}
        className={selectClass + " w-auto max-w-[120px]"}
      >
        <option value="">ทุกสถานะ</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      <select
        aria-label="ความสำคัญ"
        value={filter.priority}
        onChange={(e) => handleSelectChange("priority", e.target.value)}
        className={selectClass + " w-auto max-w-[100px]"}
      >
        <option value="">ทุกความสำคัญ</option>
        {PRIORITY_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        aria-label="ประเภท"
        value={filter.type}
        onChange={(e) => handleSelectChange("type", e.target.value)}
        className={selectClass + " w-auto max-w-[100px]"}
      >
        <option value="">ทุกประเภท</option>
        {TYPE_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {getTaskTypeMeta(t).label}
          </option>
        ))}
      </select>
      <select
        aria-label="ผู้รับผิดชอบ"
        value={filter.assignee}
        onChange={(e) => handleSelectChange("assignee", e.target.value)}
        className={selectClass + " w-auto max-w-[140px]"}
      >
        <option value="">ทุกคน</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {showSprintFilter && sprints.length > 0 && (
        <select
          aria-label="Sprint"
          value={filter.sprint}
          onChange={(e) => handleSelectChange("sprint", e.target.value)}
          className={selectClass + " w-auto max-w-[140px]"}
        >
          <option value="">ทุก Sprint</option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {showSquadFilter && projects.length > 0 && (
        <select
          aria-label="Squad"
          value={filter.squad}
          onChange={(e) => handleSelectChange("squad", e.target.value)}
          className={selectClass + " w-auto max-w-[140px]"}
        >
          <option value="">ทุก Squad</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {epics.length > 0 && (
        <select
          aria-label="Epic"
          value={filter.epic}
          onChange={(e) => handleSelectChange("epic", e.target.value)}
          className={selectClass + " w-auto max-w-[140px]"}
        >
          <option value="">ทุก Epic</option>
          {epics.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      )}
      {hasActive && (
        <Button type="button" variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
          <X className="h-4 w-4" />
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  );
}
