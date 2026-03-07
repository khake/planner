/**
 * ล้างข้อมูลในตารางทั้งหมด (ไม่ลบ schema)
 * ใช้ก่อน seed เมื่อต้องการเคลียร์แล้วใส่ข้อมูลใหม่
 * รัน: npm run db:reset-data
 * หรือ: DATABASE_URL="..." node scripts/reset-data.js
 */
const { existsSync, readFileSync } = require("fs");
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

  try {
    await client.connect();
    console.log("✅ เชื่อมต่อ Postgres แล้ว");

    await client.query(`
      TRUNCATE TABLE
        public.users,
        public.projects,
        public.profiles
      RESTART IDENTITY
      CASCADE
    `);
    console.log("✅ ล้างข้อมูลทั้งหมดแล้ว (users, projects, profiles และตารางที่อ้างอิง)");
  } catch (err) {
    console.error("❌ Reset ล้มเหลว:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
