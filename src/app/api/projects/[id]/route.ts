import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  if (!projectId) {
    return NextResponse.json({ error: "missing_project_id" }, { status: 400 });
  }

  const supabase = await createClient();

  // ลบโปรเจกต์ (Squad) และให้ฐานข้อมูลจัดการ cascade/delete ที่เกี่ยวข้องตาม constraint
  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    console.error("delete project error", error);
    return NextResponse.json(
      { error: "delete_failed", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

