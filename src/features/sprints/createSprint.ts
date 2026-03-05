import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateSprintInput = {
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  goal?: string | null;
};

export type CreateSprintResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Validate and create a sprint. Shared by Dashboard and Backlog.
 * - ห้ามชื่อซ้ำ (เทียบไม่สนใจตัวพิมพ์)
 * - วันสิ้นสุดต้องอยู่หลังหรือเท่าวันเริ่มต้น (ถ้ามีทั้งคู่)
 */
export async function createSprint(
  supabase: SupabaseClient,
  projectId: string,
  input: CreateSprintInput,
  existingSprintNames: string[] = []
): Promise<CreateSprintResult> {
  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: "กรุณาระบุชื่อ Sprint" };
  }

  const nameLower = name.toLowerCase();
  const isDuplicate = existingSprintNames.some(
    (n) => n.trim().toLowerCase() === nameLower
  );
  if (isDuplicate) {
    return { success: false, error: "ชื่อ Sprint นี้มีอยู่แล้ว" };
  }

  const start = input.start_date?.trim() || null;
  const end = input.end_date?.trim() || null;
  if (start && end && end < start) {
    return { success: false, error: "วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น" };
  }

  const { error } = await supabase.from("sprints").insert({
    project_id: projectId,
    name,
    status: "planned",
    start_date: start || null,
    end_date: end || null,
    goal: input.goal?.trim() || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
