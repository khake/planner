/**
 * Central search/filter model and URL params contract.
 * State lives in URL search params for shareable links and refresh persistence.
 */

import type { TaskStatus, TaskPriority, TaskType } from "@/types";

// ============ URL param keys (single source of truth) ============

export const PROJECT_SEARCH_PARAMS = {
  /** ค้นหาในชื่อและคำอธิบาย squad */
  q: "q",
} as const;

export const TASK_SEARCH_PARAMS = {
  /** keyword: title, description, ticket_key */
  q: "q",
  /** project/squad id */
  squad: "squad",
  /** sprint id */
  sprint: "sprint",
  status: "status",
  priority: "priority",
  type: "type",
  assignee: "assignee",
  epic: "epic",
  tag: "tag",
  /** date filter: created_at | updated_at */
  dateField: "dateField",
  dateFrom: "dateFrom",
  dateTo: "dateTo",
} as const;

export const PAGINATION_PARAMS = {
  page: "page",
  pageSize: "pageSize",
} as const;

// ============ Typed filter models ============

export interface ProjectFilterState {
  q: string;
}

export interface TaskFilterState {
  q: string;
  squad: string;
  sprint: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  type: TaskType | "";
  assignee: string;
  epic: string;
  tag: string;
  dateField: "created_at" | "updated_at" | "";
  dateFrom: string;
  dateTo: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [20, 50] as const;

// ============ Defaults ============

export const defaultProjectFilter: ProjectFilterState = {
  q: "",
};

export const defaultTaskFilter: TaskFilterState = {
  q: "",
  squad: "",
  sprint: "",
  status: "",
  priority: "",
  type: "",
  assignee: "",
  epic: "",
  tag: "",
  dateField: "",
  dateFrom: "",
  dateTo: "",
};

export const defaultPagination: PaginationState = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

// ============ Parse from URLSearchParams ============

export function parseProjectFilterFromSearchParams(
  params: URLSearchParams
): ProjectFilterState {
  return {
    q: params.get(PROJECT_SEARCH_PARAMS.q)?.trim() ?? "",
  };
}

export function parseTaskFilterFromSearchParams(
  params: URLSearchParams
): TaskFilterState {
  const status = params.get(TASK_SEARCH_PARAMS.status) ?? "";
  const priority = params.get(TASK_SEARCH_PARAMS.priority) ?? "";
  const type = params.get(TASK_SEARCH_PARAMS.type) ?? "";
  const dateField = params.get(TASK_SEARCH_PARAMS.dateField) ?? "";
  return {
    q: params.get(TASK_SEARCH_PARAMS.q)?.trim() ?? "",
    squad: params.get(TASK_SEARCH_PARAMS.squad) ?? "",
    sprint: params.get(TASK_SEARCH_PARAMS.sprint) ?? "",
    status: isTaskStatus(status) ? status : "",
    priority: isTaskPriority(priority) ? priority : "",
    type: isTaskType(type) ? type : "",
    assignee: params.get(TASK_SEARCH_PARAMS.assignee) ?? "",
    epic: params.get(TASK_SEARCH_PARAMS.epic) ?? "",
    tag: params.get(TASK_SEARCH_PARAMS.tag) ?? "",
    dateField:
      dateField === "created_at" || dateField === "updated_at" ? dateField : "",
    dateFrom: params.get(TASK_SEARCH_PARAMS.dateFrom) ?? "",
    dateTo: params.get(TASK_SEARCH_PARAMS.dateTo) ?? "",
  };
}

export function parsePaginationFromSearchParams(
  params: URLSearchParams
): PaginationState {
  const page = parseInt(params.get(PAGINATION_PARAMS.page) ?? "1", 10);
  const pageSize = parseInt(
    params.get(PAGINATION_PARAMS.pageSize) ?? String(DEFAULT_PAGE_SIZE),
    10
  );
  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSize as 20 | 50)
      ? pageSize
      : DEFAULT_PAGE_SIZE,
  };
}

function isTaskStatus(s: string): s is TaskStatus {
  return ["backlog", "todo", "in_progress", "review", "done"].includes(s);
}
function isTaskPriority(s: string): s is TaskPriority {
  return ["low", "medium", "high", "urgent"].includes(s);
}
function isTaskType(s: string): s is TaskType {
  return ["story", "task", "bug", "subtask"].includes(s);
}

// ============ Serialize to URLSearchParams ============

export function projectFilterToSearchParams(
  state: ProjectFilterState
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set(PROJECT_SEARCH_PARAMS.q, state.q);
  return params;
}

export function taskFilterToSearchParams(state: TaskFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set(TASK_SEARCH_PARAMS.q, state.q);
  if (state.squad) params.set(TASK_SEARCH_PARAMS.squad, state.squad);
  if (state.sprint) params.set(TASK_SEARCH_PARAMS.sprint, state.sprint);
  if (state.status) params.set(TASK_SEARCH_PARAMS.status, state.status);
  if (state.priority) params.set(TASK_SEARCH_PARAMS.priority, state.priority);
  if (state.type) params.set(TASK_SEARCH_PARAMS.type, state.type);
  if (state.assignee) params.set(TASK_SEARCH_PARAMS.assignee, state.assignee);
  if (state.epic) params.set(TASK_SEARCH_PARAMS.epic, state.epic);
  if (state.tag) params.set(TASK_SEARCH_PARAMS.tag, state.tag);
  if (state.dateField) params.set(TASK_SEARCH_PARAMS.dateField, state.dateField);
  if (state.dateFrom) params.set(TASK_SEARCH_PARAMS.dateFrom, state.dateFrom);
  if (state.dateTo) params.set(TASK_SEARCH_PARAMS.dateTo, state.dateTo);
  return params;
}

export function paginationToSearchParams(
  state: PaginationState
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.page > 1) params.set(PAGINATION_PARAMS.page, String(state.page));
  if (state.pageSize !== DEFAULT_PAGE_SIZE)
    params.set(PAGINATION_PARAMS.pageSize, String(state.pageSize));
  return params;
}

// ============ Merge and build full query string ============

export function buildProjectSearchString(filter: ProjectFilterState): string {
  const params = projectFilterToSearchParams(filter);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function buildTaskSearchString(
  filter: TaskFilterState,
  pagination?: PaginationState
): string {
  const params = new URLSearchParams();
  taskFilterToSearchParams(filter).forEach((v, k) => params.set(k, v));
  if (pagination) {
    paginationToSearchParams(pagination).forEach((v, k) => params.set(k, v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ============ Helpers: has active filters ============

export function hasProjectFilters(f: ProjectFilterState): boolean {
  return f.q.length > 0;
}

export function hasTaskFilters(f: TaskFilterState): boolean {
  return (
    f.q.length > 0 ||
    f.squad.length > 0 ||
    f.sprint.length > 0 ||
    f.status.length > 0 ||
    f.priority.length > 0 ||
    f.type.length > 0 ||
    f.assignee.length > 0 ||
    f.epic.length > 0 ||
    f.tag.length > 0 ||
    f.dateField.length > 0 ||
    f.dateFrom.length > 0 ||
    f.dateTo.length > 0
  );
}

// ============ Client-side filter apply (for Backlog/Board) ============

export interface TaskForFilter {
  id: string;
  title: string;
  description: string | null;
  ticket_key: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assignee_id: string | null;
  epic_id: string | null;
  tags: string[];
  sprint_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export function applyTaskFilter<T extends TaskForFilter>(
  tasks: T[],
  filter: TaskFilterState
): T[] {
  if (!hasTaskFilters(filter)) return tasks;

  const q = filter.q.trim().toLowerCase();
  return tasks.filter((t) => {
    if (q) {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description ?? "").toLowerCase().includes(q);
      const matchKey = t.ticket_key?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchKey) return false;
    }
    if (filter.sprint && t.sprint_id !== filter.sprint) return false;
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.type && t.type !== filter.type) return false;
    if (filter.assignee && t.assignee_id !== filter.assignee) return false;
    if (filter.epic && t.epic_id !== filter.epic) return false;
    if (filter.tag && !(t.tags ?? []).includes(filter.tag)) return false;
    if (filter.dateField) {
      const date = filter.dateField === "created_at" ? t.created_at : t.updated_at;
      if (!date) return false;
      const d = new Date(date);
      if (filter.dateFrom && d < new Date(filter.dateFrom)) return false;
      if (filter.dateTo && d > new Date(filter.dateTo + "T23:59:59.999Z")) return false;
    }
    return true;
  });
}

