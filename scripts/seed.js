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
      { name: "HPC", description: "Squad ดูแล High Performance Computing และ infrastructure ด้านประสิทธิภาพ" },
      { name: "Product", description: "Squad ดูแลฟีเจอร์ฝั่ง Product และ UX" },
      { name: "Order", description: "Squad ดูแลระบบคำสั่งซื้อ การชำระเงิน และ fulfillment" },
      { name: "Content", description: "Squad ดูแลเนื้อหา บทความ และระบบจัดการคอนเทนต์" },
      { name: "Platform", description: "Squad ดูแล platform กลาง เช่น auth, logging, integrations" },
    ])
    .select("id, name");

  if (projectsErr) {
    console.error("❌ projects:", projectsErr.message);
    process.exit(1);
  }

  const hpc = projects.find((p) => p.name === "HPC");
  const product = projects.find((p) => p.name === "Product");
  const order = projects.find((p) => p.name === "Order");
  const content = projects.find((p) => p.name === "Content");
  const platform = projects.find((p) => p.name === "Platform");

  const { data: sprints, error: sprintsErr } = await supabase
    .from("sprints")
    .insert([
      // HPC: 1 active + 1 planned
      { project_id: hpc.id, name: "Sprint 1", status: "active", start_date: "2025-03-01", end_date: "2025-03-14" },
      { project_id: hpc.id, name: "Sprint 2", status: "planned", start_date: "2025-03-15", end_date: "2025-03-28" },
      // Product: active sprint
      { project_id: product.id, name: "Sprint 1", status: "active", start_date: "2025-03-01", end_date: "2025-03-14" },
      // Order: planned sprint
      { project_id: order.id, name: "Sprint 1", status: "planned", start_date: "2025-03-10", end_date: "2025-03-24" },
      // Content: active sprint
      { project_id: content.id, name: "Content Sprint 1", status: "active", start_date: "2025-03-05", end_date: "2025-03-19" },
      // Platform: planned sprint
      { project_id: platform.id, name: "Platform Sprint 1", status: "planned", start_date: "2025-03-12", end_date: "2025-03-26" },
    ])
    .select("id, project_id, name");

  if (sprintsErr) {
    console.error("❌ sprints:", sprintsErr.message);
    process.exit(1);
  }

  const user1Id = users[0]?.id || null;

  const findSprint = (projectId, name) =>
    sprints.find((s) => s.project_id === projectId && s.name === name);

  const tasksPayload = [
    // HPC Sprint 1
    { project_id: hpc.id, sprint_id: findSprint(hpc.id, "Sprint 1").id, title: "ออกแบบโครงสร้าง HPC Cluster", description: "กำหนด topology, node type, storage", status: "in_progress", priority: "high", assignee_id: user1Id },
    { project_id: hpc.id, sprint_id: findSprint(hpc.id, "Sprint 1").id, title: "ตั้งค่า Monitoring", description: "ติดตั้ง Prometheus + Grafana", status: "todo", priority: "medium", assignee_id: null },
    { project_id: hpc.id, sprint_id: findSprint(hpc.id, "Sprint 1").id, title: "ทดสอบ Performance Benchmark", description: "รัน load test ชุดมาตรฐาน", status: "todo", priority: "high", assignee_id: null },

    // Product Sprint 1
    { project_id: product.id, sprint_id: findSprint(product.id, "Sprint 1").id, title: "ออกแบบ UX หน้า Dashboard", description: "Sketch / Wireframe flow หลัก", status: "in_progress", priority: "medium", assignee_id: user1Id },
    { project_id: product.id, sprint_id: findSprint(product.id, "Sprint 1").id, title: "เก็บ Requirement จาก PO", description: "สัมภาษณ์ PO + Stakeholder", status: "todo", priority: "high", assignee_id: null },

    // Content Sprint 1
    { project_id: content.id, sprint_id: findSprint(content.id, "Content Sprint 1").id, title: "วางแผนคอนเทนต์ประจำเดือน", description: "กำหนดหัวข้อบทความและ schedule", status: "todo", priority: "medium", assignee_id: null },
    { project_id: content.id, sprint_id: findSprint(content.id, "Content Sprint 1").id, title: "เขียนบทความ How-to", description: "เขียนบทความสอนใช้งานฟีเจอร์หลัก", status: "todo", priority: "low", assignee_id: null },

    // Backlog ของแต่ละ Squad
    { project_id: hpc.id, sprint_id: null, title: "ปรับ tuning ค่า kernel", description: "หาค่าที่เหมาะสมกับ workload", status: "backlog", priority: "medium", assignee_id: null },
    { project_id: product.id, sprint_id: null, title: "รีวิว Product Vision", description: "จัด workshop กับทีม", status: "backlog", priority: "high", assignee_id: null },
    { project_id: order.id, sprint_id: null, title: "ออกแบบ flow การชำระเงินใหม่", description: "รองรับช่องทางชำระเงินเพิ่มเติม", status: "backlog", priority: "high", assignee_id: null },
    { project_id: content.id, sprint_id: null, title: "จัดทำ Style Guide", description: "กำหนด tone & voice ของคอนเทนต์", status: "backlog", priority: "medium", assignee_id: null },
    { project_id: platform.id, sprint_id: null, title: "วางแผน Migrations", description: "ออกแบบ strategy สำหรับ zero-downtime", status: "backlog", priority: "high", assignee_id: null },
  ];

  const { error: tasksErr } = await supabase.from("tasks").insert(tasksPayload);

  if (tasksErr) {
    console.error("❌ tasks:", tasksErr.message);
    process.exit(1);
  }

  console.log("✅ Seed เสร็จแล้ว: users, Squads 5 รายการ, sprints และ tasks สำหรับแต่ละ Squad");
  console.log("   รีเฟรชหน้า /projects เพื่อดูข้อมูล");
}

seed();
