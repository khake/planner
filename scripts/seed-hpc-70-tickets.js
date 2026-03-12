/**
 * เพิ่ม Task / Story ตัวอย่าง 70 รายการให้โปรเจกต์ HPC
 * รัน: node scripts/seed-hpc-70-tickets.js
 * ต้องรัน seed.js ก่อน (หรือมีโปรเจกต์ HPC อยู่แล้ว)
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

// ตัวอย่างหัวข้อและคำอธิบายสำหรับ HPC (Story + Task)
const HPC_TITLES = [
  // Stories
  { type: "story", title: "รองรับ GPU scheduling ใน cluster", description: "เป็นผู้ใช้ อยากให้ระบบจัดสรร GPU ตาม workload อัตโนมัติ เพื่อให้ใช้ทรัพยากรได้เต็มที่" },
  { type: "story", title: "ลดเวลา cold start ของ job queue", description: "เป็นผู้ใช้ อยากส่ง job แล้วรันได้ภายใน 30 วินาที เพื่อให้ iteration เร็วขึ้น" },
  { type: "story", title: "Monitoring แจ้งเตือนเมื่อ node ล้ม", description: "เป็นผู้ดูแลระบบ อยากได้แจ้งเตือนทันทีเมื่อ node ใดหลุดจาก cluster เพื่อแก้ไขได้เร็ว" },
  { type: "story", title: "รายงานการใช้ทรัพยากรต่อทีม", description: "เป็นผู้จัดการ อยากดูสรุป CPU/Memory usage ต่อทีมต่อเดือน เพื่อวางแผนขยาย" },
  { type: "story", title: "Auto-scaling ตาม queue depth", description: "เป็นผู้ใช้ อยากให้จำนวน worker เพิ่ม/ลดตามความยาวคิว เพื่อประหยัด cost" },
  { type: "story", title: "Single sign-on สำหรับ HPC portal", description: "เป็นผู้ใช้ อยาก login ด้วยบัญชีองค์กรเดียว แล้วเข้าใช้ job portal ได้เลย" },
  { type: "story", title: "Quota และ limit ต่อ user/ทีม", description: "เป็นผู้ดูแล อยากกำหนด ceiling การใช้ CPU hours ต่อคน/ทีม เพื่อความเป็นธรรม" },
  { type: "story", title: "Backup และ restore ชุดข้อมูลใหญ่", description: "เป็นผู้ใช้ อยากสำรองชุดข้อมูล 100TB+ และ restore ตามจุดเวลาได้" },
  { type: "story", title: "จัดลำดับ job ตาม priority และ fairness", description: "เป็นผู้ดูแล อยากให้ scheduler รองรับ priority และไม่ให้ user เดียวกันกินทรัพยากรทั้งหมด" },
  { type: "story", title: "เอกสารและ runbook สำหรับผู้ดูแล", description: "เป็นผู้ดูแล อยากมีเอกสารการตั้งค่าและขั้นตอนแก้เหตุขัดข้องมาตรฐาน" },
  // Tasks
  { type: "task", title: "ติดตั้ง Slurm on head node", description: "ติดตั้งและ config Slurm controller บน head node" },
  { type: "task", title: "ตั้งค่า NFS share สำหรับ home directory", description: "Mount NFS และ config automount สำหรับ /home" },
  { type: "task", title: "ติดตั้ง CUDA driver บน compute nodes", description: "ติดตั้ง NVIDIA driver และ CUDA toolkit รุ่นที่รองรับ" },
  { type: "task", title: "Config firewall สำหรับ job submission port", description: "เปิดพอร์ต 6817 (Slurm) เฉพาะจากเครือข่ายภายใน" },
  { type: "task", title: "สร้าง image สำหรับ GPU node", description: "Build disk image ที่มี driver + libs สำหรับ GPU node" },
  { type: "task", title: "ตั้งค่า LDAP auth สำหรับ login nodes", description: "เชื่อม login node กับ LDAP ขององค์กร" },
  { type: "task", title: "Deploy Prometheus exporters บนทุก node", description: "ติดตั้ง node_exporter และตัวอื่นที่จำเป็น" },
  { type: "task", title: "ตั้งค่า Grafana dashboard สำหรับ cluster", description: "สร้าง dashboard แสดง queue, node status, utilization" },
  { type: "task", title: "เขียน script สร้าง user และ home dir", description: "Script สร้าง user ใหม่และ quota เริ่มต้น" },
  { type: "task", title: "ทดสอบ failover ของ Slurm controller", description: "ทดสอบการสลับ controller เมื่อ primary ล้ม" },
  { type: "task", title: "บันทึก runbook: วิธีเพิ่ม compute node", description: "เขียนขั้นตอนเพิ่ม node เข้า cluster และตรวจสอบ" },
  { type: "task", title: "รัน benchmark HPL สำหรับ acceptance", description: "รัน HPL หลังติดตั้ง cluster เพื่อยืนยันประสิทธิภาพ" },
  { type: "task", title: "ตั้งค่า log rotation สำหรับ Slurm", description: "Rotate Slurm logs เพื่อไม่ให้เต็ม disk" },
  { type: "task", title: "Config backup สำหรับ config files", description: "สำรองไฟล์ config หลักทุกวันไปยัง storage อื่น" },
  { type: "task", title: "อัปเดต kernel บน compute nodes", description: "อัปเดต kernel เป็นรุ่นที่รองรับ hardware ล่าสุด" },
  { type: "task", title: "ตั้งค่า SSH key สำหรับการ deploy", description: "จัดการ SSH key สำหรับการ deploy/config แบบอัตโนมัติ" },
  { type: "task", title: "ทดสอบ network bandwidth ระหว่าง node", description: "รัน iperf3 ระหว่าง node เพื่อตรวจสอบ throughput" },
  { type: "task", title: "Document การขอ quota เพิ่ม", description: "เขียน flow การขอเพิ่ม CPU/memory quota" },
  { type: "task", title: "ตั้งค่า alert เมื่อ disk usage > 85%", description: "Prometheus/Alertmanager rule แจ้งเตือนเมื่อ partition เต็ม" },
  { type: "task", title: "ตรวจสอบและอัปเดต SSL cert สำหรับ portal", description: "ต่ออายุหรือเปลี่ยน cert สำหรับ HPC portal" },
  { type: "task", title: "เพิ่ม partition สำหรับ job สั้น (< 1 ชม.)", description: "สร้าง Slurm partition สำหรับ short job เพื่อลด queue time" },
  { type: "task", title: "ทดสอบ restore จาก backup", description: "ทดสอบดึง config และข้อมูลสำคัญกลับจาก backup" },
  { type: "task", title: "รัน security scan บน image", description: "สแกน CVE และ compliance บน OS image ที่ใช้" },
  { type: "task", title: "ตั้งค่า cgroup สำหรับ memory limit", description: "เปิดใช้ cgroup v2 และ limit memory ต่อ job" },
  { type: "task", title: "สร้างรายงาน utilization รายสัปดาห์", description: "Script สร้างสรุป usage ส่งให้ทีมทุกสัปดาห์" },
  { type: "task", title: "อัปเกรด Slurm เป็นรุ่นล่าสุด", description: "วางแผนและดำเนินการอัปเกรด Slurm" },
  { type: "task", title: "ติดตั้ง MPI library (OpenMPI) บน nodes", description: "ติดตั้ง OpenMPI และทดสอบการรันแบบ multi-node" },
  { type: "task", title: "ตั้งค่า module system (Environment Modules)", description: "ติดตั้ง Lmod และ module files สำหรับซอฟต์แวร์หลัก" },
  { type: "task", title: "เขียนเอกสาร Quick start สำหรับ user ใหม่", description: "เอกสารสั้นๆ วิธี submit job และดูผล" },
  { type: "task", title: "ตรวจสอบและปิดช่องโหว่ที่พบจาก audit", description: "ดำเนินการตามรายการจาก security audit" },
  { type: "task", title: "ตั้งค่า reservation สำหรับ training", description: "จอง node สำหรับ workshop วันที่กำหนด" },
  { type: "task", title: "ทดสอบการย้าย job ระหว่าง partition", description: "ตรวจสอบว่า job สามารถย้ายได้เมื่อมี priority" },
  { type: "task", title: "เพิ่ม node 10 เครื่องเข้า cluster", description: "รับเครื่องใหม่ ติดตั้ง OS และ join cluster" },
  { type: "task", title: "ตั้งค่า VPN สำหรับ remote access", description: "ให้ผู้ใช้เข้าถึง login node ผ่าน VPN ได้" },
  { type: "task", title: "รัน chaos test: ปิด node กลางคัน", description: "ทดสอบว่า Slurm และ job รับมือกับ node หายได้" },
  { type: "task", title: "อัปเดต Grafana เป็นรุ่นล่าสุด", description: "อัปเกรด Grafana และ plugins ที่ใช้" },
  { type: "task", title: "สร้าง dashboard สำหรับ cost allocation", description: "Dashboard แสดง usage แยกตามทีม/โปรเจกต์" },
  { type: "task", title: "ตั้งค่า preemptible partition", description: "Partition สำหรับ low-priority job ที่อาจถูก preempt" },
  { type: "task", title: "ทดสอบ multi-tenancy isolation", description: "ตรวจสอบว่า job ของ user A ไม่เห็นข้อมูล user B" },
  { type: "task", title: "ติดตั้ง profiling tools (perf, nvprof)", description: "ติดตั้งเครื่องมือสำหรับวิเคราะห์ performance" },
  { type: "task", title: "เขียน integration กับ ticketing system", description: "ส่ง alert ไปสร้าง ticket อัตโนมัติเมื่อเกิด incident" },
  { type: "task", title: "จัด workshop การใช้ cluster ให้ทีมใหม่", description: "จัด session สอน submit job และ best practices" },
  { type: "task", title: "ตรวจสอบและแก้ไข flaky test ใน CI", description: "แก้ test ที่ fail สุ่มใน pipeline deploy config" },
  { type: "task", title: "ตั้งค่า rate limit สำหรับ job submission", description: "จำกัดจำนวน job ต่อ user ต่อช่วงเวลา" },
  { type: "task", title: "เพิ่ม disk ใน node ที่เต็ม", description: "ขยายหรือเพิ่ม volume สำหรับ scratch space" },
  { type: "task", title: "อัปเดต BIOS และ firmware บน nodes", description: "อัปเดต firmware ตามคำแนะนำของผู้ผลิต" },
  { type: "task", title: "ทดสอบ disaster recovery procedure", description: "รัน DR drill: restore ทั้ง cluster จาก backup" },
  { type: "task", title: "จัดทำ SLA document สำหรับ HPC service", description: "เขียน SLA uptime, support response time" },
  { type: "task", title: "ตั้งค่า maintenance window ใน calendar", description: "กำหนดวัน/เวลาที่ใช้สำหรับ maintenance เป็นประจำ" },
  { type: "task", title: "วิเคราะห์และลดค่าใช้จ่าย cloud burst", description: "ดูการใช้ cloud burst และหาทางลด cost" },
  { type: "task", title: "ติดตั้งและ config InfiniBand (ถ้ามี)", description: "ตั้งค่า IB network สำหรับ low-latency job" },
  { type: "task", title: "สร้าง sandbox environment สำหรับทดลอง", description: "Environment แยกสำหรับ user ทดลองซอฟต์แวร์ใหม่" },
  { type: "task", title: "รัน benchmark ชุดเต็มก่อน handover", description: "รัน benchmark ครบก่อนส่งมอบ cluster ให้ operations" },
];

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

async function seedHpc70() {
  console.log("กำลังโหลดโปรเจกต์ HPC และ sprints...");

  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id, name")
    .eq("name", "HPC")
    .limit(1);

  if (projErr || !projects?.length) {
    console.error("❌ ไม่พบโปรเจกต์ HPC (รัน node scripts/seed.js ก่อนหรือสร้าง Squad ชื่อ HPC ก่อน)");
    process.exit(1);
  }

  const hpc = projects[0];

  const { data: sprints, error: sprintsErr } = await supabase
    .from("sprints")
    .select("id, project_id, name")
    .eq("project_id", hpc.id)
    .order("name", { ascending: true });

  if (sprintsErr) {
    console.error("❌ sprints:", sprintsErr.message);
    process.exit(1);
  }

  const sprint1 = sprints?.find((s) => s.name === "Sprint 1" || s.name?.includes("Sprint 1"));
  const sprint2 = sprints?.find((s) => s.name === "Sprint 2" || s.name?.includes("Sprint 2"));
  const sprintIds = [sprint1?.id, sprint2?.id].filter(Boolean);
  if (sprintIds.length === 0 && sprints?.length > 0) sprintIds.push(sprints[0].id);
  else if (sprintIds.length === 0) {
    console.error("❌ โปรเจกต์ HPC ยังไม่มี Sprint (สร้าง Sprint ใน HPC ก่อนหรือรัน seed.js)");
    process.exit(1);
  }

  const statuses = ["backlog", "todo", "in_progress", "review", "done"];
  const priorities = ["low", "medium", "high", "urgent"];

  const tasks = [];
  const total = 70;
  for (let i = 0; i < total; i++) {
    const template = HPC_TITLES[i % HPC_TITLES.length];
    const inSprint = i % 3 !== 0; // ~2/3 ใน sprint, 1/3 backlog
    const sprintId = inSprint ? sprintIds[i % sprintIds.length] : null;
    const status = sprintId
      ? statuses[i % statuses.length]
      : "backlog";
    const priority = priorities[i % priorities.length];

    tasks.push({
      project_id: hpc.id,
      sprint_id: sprintId,
      type: template.type,
      parent_id: null,
      title: `${template.title} (${i + 1}/${total})`,
      description: template.description,
      tags: [],
      status,
      priority,
      assignee_id: null,
      qa_status: "pending",
      qa_assignee_id: null,
      qa_checklist: [],
    });
  }

  const tasksWithPosition = assignSequentialPositions(tasks);

  console.log(`กำลังใส่ tasks ${total} รายการ (Story + Task) ใน HPC...`);

  const BATCH = 25;
  for (let offset = 0; offset < tasksWithPosition.length; offset += BATCH) {
    const batch = tasksWithPosition.slice(offset, offset + BATCH);
    const { error } = await supabase.from("tasks").insert(batch);
    if (error) {
      console.error("❌ tasks insert:", error.message);
      process.exit(1);
    }
    console.log(`   ใส่แล้ว ${Math.min(offset + BATCH, total)}/${total}`);
  }

  console.log("✅ Seed HPC 70 tickets เสร็จแล้ว");
  console.log("   เปิด Squad HPC → Backlog หรือ Board เพื่อดู HPC-1 ถึง HPC-70 (หรือเลขถัดไปถ้ามี task อยู่แล้ว)");
}

seedHpc70();
