/**
 * ใส่ข้อมูลตัวอย่าง (seed) ใน Supabase
 * รัน: node scripts/seed.js
 * ต้องมี .env.local กับ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
const { createClient } = require("@supabase/supabase-js");
const { readFileSync, existsSync } = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  console.log("กำลังใส่ seed data...");

  const { data: existing } = await supabase.from("projects").select("id").limit(1);
  if (existing && existing.length > 0) {
    console.log("⚠️ มีโปรเจกต์อยู่แล้ว ไม่ใส่ seed ซ้ำ (ลบข้อมูลใน Supabase ก่อนถ้าต้องการรันใหม่)");
    return;
  }

  const { data: users, error: usersErr } = await supabase
    .from("users")
    .insert([
      { name: "สมชาย ใจดี", avatar_url: null },
      { name: "สมหญิง รักงาน", avatar_url: null },
    ])
    .select("id");

  if (usersErr) {
    console.error("❌ users:", usersErr.message);
    process.exit(1);
  }

  const { data: projects, error: projectsErr } = await supabase
    .from("projects")
    .insert([
      { name: "Jira Clone", description: "โปรเจกต์ทดสอบแอป Jira Clone" },
      { name: "เว็บบริษัท", description: "พัฒนาเว็บไซต์องค์กร" },
    ])
    .select("id");

  if (projectsErr) {
    console.error("❌ projects:", projectsErr.message);
    process.exit(1);
  }

  const [project1] = projects;

  const { data: sprints, error: sprintsErr } = await supabase
    .from("sprints")
    .insert([
      { project_id: project1.id, name: "Sprint 1", status: "active", start_date: "2025-03-01", end_date: "2025-03-14" },
      { project_id: project1.id, name: "Sprint 2", status: "planned", start_date: "2025-03-15", end_date: "2025-03-28" },
    ])
    .select("id");

  if (sprintsErr) {
    console.error("❌ sprints:", sprintsErr.message);
    process.exit(1);
  }

  const [sprint1] = sprints;
  const user1Id = users[0]?.id || null;

  const tasksPayload = [
    { project_id: project1.id, sprint_id: sprint1.id, title: "ตั้งค่าโปรเจกต์", description: "สร้าง board และ workflow", status: "done", priority: "high", assignee_id: user1Id },
    { project_id: project1.id, sprint_id: sprint1.id, title: "ออกแบบ UI", description: "Wireframe หน้าหลัก", status: "in_progress", priority: "medium", assignee_id: user1Id },
    { project_id: project1.id, sprint_id: sprint1.id, title: "API Backend", description: "REST API สำหรับ tasks", status: "review", priority: "high", assignee_id: null },
    { project_id: project1.id, sprint_id: sprint1.id, title: "ทดสอบระบบ", description: "E2E tests", status: "todo", priority: "low", assignee_id: null },
  ];
  const backlogPayload = [
    { project_id: project1.id, sprint_id: null, title: "ทำเอกสาร API", description: "เขียน Swagger/OpenAPI", status: "backlog", priority: "medium", assignee_id: null },
    { project_id: project1.id, sprint_id: null, title: "ปรับปรุง Performance", description: "Optimize queries", status: "backlog", priority: "low", assignee_id: null },
  ];

  const { error: tasksErr } = await supabase.from("tasks").insert([...tasksPayload, ...backlogPayload]);

  if (tasksErr) {
    console.error("❌ tasks:", tasksErr.message);
    process.exit(1);
  }

  console.log("✅ Seed เสร็จแล้ว: users, โปรเจกต์ 2 รายการ, sprints, tasks ใน sprint และ backlog");
  console.log("   รีเฟรชหน้า /projects เพื่อดูข้อมูล");
}

seed();
