/**
 * ใส่ข้อมูลตัวอย่าง (seed) ใน Supabase
 * รัน: node scripts/seed.js
 * ข้อมูล ticket เยอะ (ทดสอบความเร็ว): SEED_TASK_COUNT=200 node scripts/seed.js
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
const POSITION_GAP = 1024;

const EXTRA_TASK_COUNT = Math.max(0, parseInt(process.env.SEED_TASK_COUNT || "0", 10));

function assignSequentialPositions(tasks) {
  const positionCounters = new Map();
  const boardCounters = new Map();

  return tasks.map((task) => {
    const positionGroupKey = `${task.project_id}:${task.sprint_id ?? "backlog"}`;
    const nextPositionIndex = (positionCounters.get(positionGroupKey) ?? 0) + 1;
    positionCounters.set(positionGroupKey, nextPositionIndex);

    let boardPosition = null;
    if (task.sprint_id) {
      const boardGroupKey = `${task.project_id}:${task.sprint_id}:${task.status}`;
      const nextBoardIndex = (boardCounters.get(boardGroupKey) ?? 0) + 1;
      boardCounters.set(boardGroupKey, nextBoardIndex);
      boardPosition = nextBoardIndex * POSITION_GAP;
    }

    return {
      ...task,
      position: nextPositionIndex * POSITION_GAP,
      board_position: boardPosition,
    };
  });
}

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

  const statuses = ["backlog", "todo", "in_progress", "review", "done"];
  const priorities = ["low", "medium", "high", "urgent"];
  const hpcSprint1 = findSprint(hpc.id, "Sprint 1");
  const productSprint1 = findSprint(product.id, "Sprint 1");

  const baseTasks = [
    // HPC Sprint 1 – งาน dev ปกติ
    {
      project_id: hpc.id,
      sprint_id: hpcSprint1.id,
      title: "ออกแบบโครงสร้าง HPC Cluster",
      description: "กำหนด topology, node type, storage",
      status: "in_progress",
      priority: "high",
      assignee_id: user1Id,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },
    {
      project_id: hpc.id,
      sprint_id: hpcSprint1.id,
      title: "ตั้งค่า Monitoring",
      description: "ติดตั้ง Prometheus + Grafana",
      status: "todo",
      priority: "medium",
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },

    // HPC Sprint 1 – ตัวอย่าง QA flow
    {
      project_id: hpc.id,
      sprint_id: hpcSprint1.id,
      title: "[QA] ทดสอบ Performance Benchmark",
      description: "รัน load test ชุดมาตรฐาน และบันทึกผลไว้ใน Markdown",
      status: "ready_for_qa",
      priority: "high",
      assignee_id: user1Id,
      qa_status: "pending",
      qa_assignee_id: user1Id,
      qa_checklist: [
        {
          id: "bench-1",
          label: "รัน load test ครบทุก scenario",
          passed: false,
        },
        {
          id: "bench-2",
          label: "เปรียบเทียบผลกับ baseline sprint ก่อนหน้า",
          passed: false,
        },
      ],
    },
    {
      project_id: hpc.id,
      sprint_id: hpcSprint1.id,
      title: "[QA] ตรวจสอบ Dashboard และ Alert",
      description: "ตรวจสอบว่ามี metric ครบ และ Alert ทำงานตามเงื่อนไข",
      status: "qa_in_progress",
      priority: "medium",
      assignee_id: user1Id,
      qa_status: "pending",
      qa_assignee_id: user1Id,
      qa_checklist: [
        {
          id: "dash-1",
          label: "กราฟ CPU/Memory แสดงถูกต้อง",
          passed: true,
        },
        {
          id: "dash-2",
          label: "ลองยิง load ให้ Alert ทำงาน",
          passed: false,
        },
      ],
    },
    {
      project_id: hpc.id,
      sprint_id: hpcSprint1.id,
      title: "[QA] งานที่ผ่าน QA แล้ว",
      description: "ตัวอย่างงานที่ QA กด Passed แล้วเพื่อให้เห็นสถานะบนบอร์ด",
      status: "done",
      priority: "medium",
      assignee_id: user1Id,
      qa_status: "passed",
      qa_assignee_id: user1Id,
      qa_checklist: [
        {
          id: "done-1",
          label: "ตรวจ checklist ทั้งหมดแล้ว",
          passed: true,
        },
      ],
    },

    // Product Sprint 1
    {
      project_id: product.id,
      sprint_id: productSprint1.id,
      title: "ออกแบบ UX หน้า Dashboard",
      description: "Sketch / Wireframe flow หลัก",
      status: "in_progress",
      priority: "medium",
      assignee_id: user1Id,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },
    {
      project_id: product.id,
      sprint_id: productSprint1.id,
      title: "เก็บ Requirement จาก PO",
      description: "สัมภาษณ์ PO + Stakeholder",
      status: "todo",
      priority: "high",
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },

    // Content Sprint 1
    {
      project_id: content.id,
      sprint_id: findSprint(content.id, "Content Sprint 1").id,
      title: "วางแผนคอนเทนต์ประจำเดือน",
      description: "กำหนดหัวข้อบทความและ schedule",
      status: "todo",
      priority: "medium",
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },
    {
      project_id: content.id,
      sprint_id: findSprint(content.id, "Content Sprint 1").id,
      title: "เขียนบทความ How-to",
      description: "เขียนบทความสอนใช้งานฟีเจอร์หลัก",
      status: "todo",
      priority: "low",
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },

    // Backlog ของแต่ละ Squad
    {
      project_id: hpc.id,
      sprint_id: null,
      title: "ปรับ tuning ค่า kernel",
      description: "หาค่าที่เหมาะสมกับ workload",
      status: "backlog",
      priority: "medium",
      assignee_id: null,
      qa_status: "failed",
      qa_assignee_id: user1Id,
      qa_checklist: [
        {
          id: "kernel-1",
          label: "ทดสอบ reboot ทุก node แล้ว",
          passed: true,
        },
        {
          id: "kernel-2",
          label: "ตรวจสอบ log error หลังอัปเดต kernel",
          passed: false,
        },
      ],
    },
    {
      project_id: product.id,
      sprint_id: null,
      title: "รีวิว Product Vision",
      description: "จัด workshop กับทีม",
      status: "backlog",
      priority: "high",
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },
    {
      project_id: order.id,
      sprint_id: null,
      title: "ออกแบบ flow การชำระเงินใหม่",
      description: "รองรับช่องทางชำระเงินเพิ่มเติม",
      status: "backlog",
      priority: "high",
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },
    {
      project_id: content.id,
      sprint_id: null,
      title: "จัดทำ Style Guide",
      description: "กำหนด tone & voice ของคอนเทนต์",
      status: "backlog",
      priority: "medium",
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },
    {
      project_id: platform.id,
      sprint_id: null,
      title: "วางแผน Migrations",
      description: "ออกแบบ strategy สำหรับ zero-downtime",
      status: "backlog",
      priority: "high",
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    },
  ];

  if (EXTRA_TASK_COUNT > 0) {
    const titles = [
      "ปรับปรุงประสิทธิภาพ module %d",
      "แก้ไข bug รายงานจาก QA #%d",
      "Refactor โค้ดส่วน %d",
      "เพิ่ม unit test สำหรับ %d",
      "อัปเดต dependency และ security patch %d",
      "เขียนเอกสาร API endpoint %d",
      "ติดตั้งและ config เซิร์ฟเวอร์ %d",
      "Review และ merge PR ที่เกี่ยวข้องกับ %d",
      "ติดตาม metric และ alert %d",
      "สืบสวน incident รายการที่ %d",
    ];
    const projectsWithSprints = [
      { project_id: hpc.id, sprint_id: hpcSprint1.id },
      { project_id: product.id, sprint_id: productSprint1.id },
    ];
    for (let i = 0; i < EXTRA_TASK_COUNT; i++) {
      const status = statuses[i % statuses.length];
      const sprintId = status === "backlog" ? null : projectsWithSprints[i % projectsWithSprints.length].sprint_id;
      const projectId = status === "backlog"
        ? [hpc.id, product.id, order.id, content.id, platform.id][i % 5]
        : projectsWithSprints[i % projectsWithSprints.length].project_id;
      baseTasks.push({
        project_id: projectId,
        sprint_id: sprintId,
        title: titles[i % titles.length].replace("%d", String(i + 1)),
        description: `รายการที่ ${i + 1} สำหรับทดสอบการแสดงผลและความเร็ว`,
        status,
        priority: priorities[i % priorities.length],
        assignee_id: i % 5 === 0 ? user1Id : null,
        qa_status: "pending",
        qa_assignee_id: null,
        qa_checklist: [],
      });
    }
    console.log(`   สร้าง ticket เพิ่ม ${EXTRA_TASK_COUNT} รายการ (รวม backlog + sprint หลาย status)`);
  }

  const tasksPayload = assignSequentialPositions(baseTasks);
  const BATCH_SIZE = 100;

  if (tasksPayload.length <= BATCH_SIZE) {
    const { error: tasksErr } = await supabase.from("tasks").insert(tasksPayload);
    if (tasksErr) {
      console.error("❌ tasks:", tasksErr.message);
      process.exit(1);
    }
  } else {
    for (let i = 0; i < tasksPayload.length; i += BATCH_SIZE) {
      const batch = tasksPayload.slice(i, i + BATCH_SIZE);
      const { error: tasksErr } = await supabase.from("tasks").insert(batch);
      if (tasksErr) {
        console.error("❌ tasks (batch):", tasksErr.message);
        process.exit(1);
      }
      console.log(`   ใส่ tasks ชุดที่ ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} รายการ)`);
    }
  }

  console.log("✅ Seed เสร็จแล้ว: users, Squads 5 รายการ, sprints และ tasks รวม " + tasksPayload.length + " ticket");
  console.log("   รีเฟรชหน้า /projects เพื่อดูข้อมูล");
}

seed();
