/**
 * Server-side task query for Issue Explorer.
 * Applies filter and pagination, returns tasks + total count.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskFilterState, PaginationState } from "./search-filter";

export type TaskRow = {
  id: string;
  project_id: string;
  sprint_id: string | null;
  type: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  status: string;
  priority: string;
  assignee_id: string | null;
  ticket_number: number;
  ticket_key: string;
  epic_id: string | null;
  created_at?: string;
  updated_at?: string;
  projects?: { id: string; name: string } | null;
};

export async function queryTasksForExplorer(
  supabase: SupabaseClient,
  filter: TaskFilterState,
  pagination: PaginationState
): Promise<{ tasks: TaskRow[]; total: number }> {
  const pageSize = Math.min(
    Math.max(1, pagination.pageSize),
    50
  );
  const from = (pagination.page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Select only fields needed for list view to keep payload small
  const selectColumns =
    "id, project_id, sprint_id, type, parent_id, title, description, tags, status, priority, assignee_id, ticket_number, ticket_key, epic_id, created_at, updated_at, projects(id, name)";
  let query = supabase
    .from("tasks")
    .select(selectColumns, { count: "exact" })
    .order("updated_at", { ascending: false });

  if (filter.q.trim()) {
    const q = filter.q.trim();
    query = query.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,ticket_key.ilike.%${q}%`
    );
  }
  if (filter.squad) query = query.eq("project_id", filter.squad);
  if (filter.sprint) query = query.eq("sprint_id", filter.sprint);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.priority) query = query.eq("priority", filter.priority);
  if (filter.type) query = query.eq("type", filter.type);
  if (filter.assignee) query = query.eq("assignee_id", filter.assignee);
  if (filter.epic) query = query.eq("epic_id", filter.epic);
  if (filter.tag) query = query.contains("tags", [filter.tag]);
  if (filter.dateField) {
    if (filter.dateFrom) {
      query = query.gte(filter.dateField, filter.dateFrom);
    }
    if (filter.dateTo) {
      query = query.lte(
        filter.dateField,
        filter.dateTo.includes("T") ? filter.dateTo : `${filter.dateTo}T23:59:59.999Z`
      );
    }
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return { tasks: [], total: 0 };
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    projects: Array.isArray(row.projects) ? row.projects[0] ?? null : row.projects ?? null,
  }));
  return {
    tasks: rows as TaskRow[],
    total: count ?? 0,
  };
}
