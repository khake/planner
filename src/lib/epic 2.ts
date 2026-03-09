import type { Epic, EpicInsert, EpicUpdate, TaskWithAssignee } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * เช็คว่า task ของ project_id นี้ผูกกับ epic นี้ได้หรือไม่
 * - Squad Epic (epic.project_id ไม่ null): ต้อง task.project_id === epic.project_id
 * - Global Epic (epic.project_id null): ผูกได้ทุก project
 */
export function canLinkTaskToEpic(
  epic: Pick<Epic, "project_id">,
  taskProjectId: string
): boolean {
  if (epic.project_id == null) return true;
  return epic.project_id === taskProjectId;
}

/** รายการ Squad Epics (project_id = projectId) */
export async function fetchSquadEpics(
  supabase: SupabaseClient,
  projectId: string
): Promise<Epic[]> {
  const { data, error } = await supabase
    .from("epics")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Epic[];
}

/** รายการ Global Epics (project_id IS NULL) */
export async function fetchGlobalEpics(supabase: SupabaseClient): Promise<Epic[]> {
  const { data, error } = await supabase
    .from("epics")
    .select("*")
    .is("project_id", null)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Epic[];
}

/** Epic เดียว + งานที่ผูกอยู่ */
export async function fetchEpicWithTasks(
  supabase: SupabaseClient,
  epicId: string
): Promise<{ epic: Epic | null; tasks: TaskWithAssignee[] }> {
  const { data: epic, error: epicError } = await supabase
    .from("epics")
    .select("*")
    .eq("id", epicId)
    .single();
  if (epicError || !epic) return { epic: null, tasks: [] };

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("epic_id", epicId)
    .order("position", { ascending: true });
  if (tasksError) return { epic: epic as Epic, tasks: [] };

  return { epic: epic as Epic, tasks: (tasks ?? []) as TaskWithAssignee[] };
}

export async function createEpic(
  supabase: SupabaseClient,
  payload: EpicInsert
): Promise<Epic> {
  const { data, error } = await supabase
    .from("epics")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as Epic;
}

export async function updateEpic(
  supabase: SupabaseClient,
  id: string,
  payload: EpicUpdate
): Promise<Epic> {
  const { data, error } = await supabase
    .from("epics")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Epic;
}

export async function deleteEpic(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("epics").delete().eq("id", id);
  if (error) throw error;
}

/** อัปเดต epic_id ของ task (เรียกหลังตรวจ canLinkTaskToEpic แล้ว) */
export async function setTaskEpic(
  supabase: SupabaseClient,
  taskId: string,
  epicId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ epic_id: epicId })
    .eq("id", taskId);
  if (error) throw error;
}
