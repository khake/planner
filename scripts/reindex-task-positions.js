/**
 * Reindex task.position หรือ task.board_position ให้กลับมาเป็นช่วงคงที่ เช่น 1024, 2048, 3072
 *
 * ใช้:
 *   npm run db:reindex-positions
 *   npm run db:reindex-positions -- --project-id <uuid>
 *   npm run db:reindex-positions -- --project-id <uuid> --sprint-id <uuid>
 *   npm run db:reindex-positions -- --project-id <uuid> --sprint-id backlog
 *   npm run db:reindex-positions -- --per-status
 *   npm run db:reindex-positions -- --board
 *   npm run db:reindex-positions -- --board --project-id <uuid> --sprint-id <uuid>
 *   npm run db:reindex-positions -- --dry-run
 *   npm run db:reindex-positions -- --gap 2048
 */
const { existsSync, readFileSync } = require("fs");
const path = require("path");

const BACKLOG_SENTINEL_UUID = "00000000-0000-0000-0000-000000000000";
const DEFAULT_GAP = 1024;

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function parseArgs(argv) {
  const options = {
    projectId: null,
    sprintId: null,
    dryRun: false,
    perStatus: false,
    board: false,
    gap: DEFAULT_GAP,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--project-id") {
      options.projectId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--sprint-id") {
      options.sprintId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--gap") {
      options.gap = Number(argv[index + 1] ?? DEFAULT_GAP);
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--per-status") {
      options.perStatus = true;
      continue;
    }

    if (arg === "--board") {
      options.board = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!Number.isFinite(options.gap) || options.gap <= 0) {
    throw new Error("ค่า --gap ต้องเป็นตัวเลขมากกว่า 0");
  }

  if (options.board && options.sprintId === "backlog") {
    throw new Error("ไม่สามารถใช้ --board ร่วมกับ --sprint-id backlog ได้");
  }

  return options;
}

function printUsage() {
  console.log(`ตัวอย่างการใช้งาน:
  npm run db:reindex-positions
  npm run db:reindex-positions -- --project-id <uuid>
  npm run db:reindex-positions -- --project-id <uuid> --sprint-id <uuid>
  npm run db:reindex-positions -- --project-id <uuid> --sprint-id backlog
  npm run db:reindex-positions -- --per-status
  npm run db:reindex-positions -- --board
  npm run db:reindex-positions -- --board --project-id <uuid> --sprint-id <uuid>
  npm run db:reindex-positions -- --dry-run
  npm run db:reindex-positions -- --gap 2048

หมายเหตุ:
  - default จะ reindex field position ตามกลุ่ม project_id + sprint_id
  - ถ้าใส่ --per-status จะ reindex position แยกในแต่ละ status ด้วย
  - ถ้าใส่ --board จะ reindex field board_position ตามกลุ่ม project_id + sprint_id + status
  - ถ้าใส่ --sprint-id backlog จะหมายถึง sprint_id IS NULL (ใช้ได้เฉพาะ position)`);
}

function buildScope(options) {
  const filters = [];
  const values = [];

  if (options.board) {
    filters.push("sprint_id is not null");
  }

  if (options.projectId) {
    values.push(options.projectId);
    filters.push(`project_id = $${values.length}`);
  }

  if (options.sprintId === "backlog") {
    filters.push("sprint_id is null");
  } else if (options.sprintId) {
    values.push(options.sprintId);
    filters.push(`sprint_id = $${values.length}`);
  }

  return {
    whereClause: filters.length > 0 ? `where ${filters.join(" and ")}` : "",
    values,
  };
}

function buildPartitionColumns(options) {
  if (options.board) {
    return ["project_id", "sprint_id", "status"].join(", ");
  }

  const columns = [
    "project_id",
    `coalesce(sprint_id, '${BACKLOG_SENTINEL_UUID}'::uuid)`,
  ];

  if (options.perStatus) {
    columns.push("status");
  }

  return columns.join(", ");
}

async function main() {
  loadEnvLocal();

  const options = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes("[YOUR-PASSWORD]")) {
    console.error("❌ ตั้งค่า DATABASE_URL ใน environment ก่อน");
    process.exit(1);
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: databaseUrl });
  const scope = buildScope(options);
  const partitionBy = buildPartitionColumns(options);
  const gapParamIndex = scope.values.length + 1;
  const targetColumn = options.board ? "board_position" : "position";

  const previewSql = `
    with ranked as (
      select
        id,
        project_id,
        sprint_id,
        status,
        title,
        ${targetColumn} as old_value,
        row_number() over (
          partition by ${partitionBy}
          order by ${targetColumn} asc nulls last, created_at asc, id asc
        ) * $${gapParamIndex}::double precision as new_value
      from public.tasks
      ${scope.whereClause}
    )
    select
      id,
      project_id,
      sprint_id,
      status,
      title,
      old_value,
      new_value
    from ranked
    where old_value is distinct from new_value
    order by project_id, sprint_id nulls first, status, new_value, title;
  `;

  const updateSql = `
    with ranked as (
      select
        id,
        row_number() over (
          partition by ${partitionBy}
          order by ${targetColumn} asc nulls last, created_at asc, id asc
        ) * $${gapParamIndex}::double precision as new_value
      from public.tasks
      ${scope.whereClause}
    )
    update public.tasks as tasks
    set ${targetColumn} = ranked.new_value
    from ranked
    where tasks.id = ranked.id
      and tasks.${targetColumn} is distinct from ranked.new_value;
  `;

  try {
    await client.connect();

    const previewValues = [...scope.values, options.gap];
    const preview = await client.query(previewSql, previewValues);

    if (preview.rows.length === 0) {
      console.log(`✅ ไม่พบแถวที่ต้อง reindex ${targetColumn}`);
      return;
    }

    console.log(`พบ ${preview.rows.length} แถวที่ต้อง reindex ${targetColumn}`);
    console.table(
      preview.rows.slice(0, 20).map((row) => ({
        title: row.title,
        status: row.status,
        sprint_id: row.sprint_id ?? "backlog",
        old_value: row.old_value,
        new_value: row.new_value,
      }))
    );

    if (options.dryRun) {
      console.log("ℹ️ dry-run: ยังไม่ได้อัปเดตข้อมูลจริง");
      return;
    }

    await client.query("begin");
    await client.query(updateSql, previewValues);
    await client.query("commit");

    console.log(`✅ reindex ${targetColumn} สำเร็จ`);
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore rollback errors
    }
    console.error(`❌ reindex ${targetColumn} ล้มเหลว:`, error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
