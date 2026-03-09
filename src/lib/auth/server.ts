import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ProjectMember, ProjectRole } from "@/types";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export async function redirectAuthenticatedUser(to = "/projects") {
  const user = await getCurrentUser();

  if (user) {
    redirect(to);
  }
}

export async function getProjectMember(
  projectId: string,
  userId?: string
): Promise<ProjectMember | null> {
  const currentUserId = userId ?? (await getCurrentUser())?.id;
  if (!currentUserId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("project_id, user_id, role, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  // ตาราง role ยังอาจยังไม่ถูก migrate ในบาง environment
  if (error) return null;

  return data as ProjectMember | null;
}

export async function getProjectRole(
  projectId: string,
  userId?: string
): Promise<ProjectRole | null> {
  const member = await getProjectMember(projectId, userId);
  return member?.role ?? null;
}

export async function hasProjectRole(
  projectId: string,
  allowedRoles: ProjectRole[],
  userId?: string
) {
  const role = await getProjectRole(projectId, userId);
  return role ? allowedRoles.includes(role) : false;
}

