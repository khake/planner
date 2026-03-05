/**
 * รัน migration สร้างตารางใน Supabase/PostgreSQL
 * ใช้: DATABASE_URL="..." node scripts/run-migration.js
 * หรือใส่ DATABASE_URL ใน .env.local แล้วรัน npm run db:migrate
 */
const { readFileSync, readdirSync, existsSync } = require("fs");
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

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes("[YOUR-PASSWORD]")) {
    console.error("❌ ตั้งค่า DATABASE_URL ใน environment ก่อน");
    console.error('   ตัวอย่าง: export DATABASE_URL="postgresql://postgres:รหัสผ่านจริง@db.xxx.supabase.co:5432/postgres"');
    process.exit(1);
  }

  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: databaseUrl });
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  try {
    await client.connect();
    console.log("✅ เชื่อมต่อ Postgres แล้ว");

    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = readFileSync(sqlPath, "utf8");
      await client.query(sql);
      console.log("✅ รัน:", file);
    }
    console.log("✅ รัน migration ทั้งหมดเสร็จแล้ว");
  } catch (err) {
    console.error("❌ Migration ล้มเหลว:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
