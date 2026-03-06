import { createClient } from "@/lib/supabase/server";

export async function createLog(params: {
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: unknown;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("activity_logs").insert({
    user_id: params.userId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    details: params.details ?? null,
  });

  if (error) {
    console.error("activity_logs error:", error.message);
  }
}

