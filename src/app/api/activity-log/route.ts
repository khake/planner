import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = (await getCurrentUser())?.id ?? null;

  const body = await request.json().catch(() => null);
  if (!body || !body.action || !body.targetType || !body.targetId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { error } = await supabase.from("activity_logs").insert({
    user_id: userId,
    action: body.action,
    target_type: body.targetType,
    target_id: body.targetId,
    details: body.details ?? null,
  });

  if (error) {
    console.error("activity_logs error:", error.message);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

