/**
 * Resync auth.users -> public.profiles + public.users
 *
 * ใช้:
 *   npm run db:resync-auth-users
 *   npm run db:resync-auth-users -- --dry-run
 */
const { existsSync, readFileSync } = require("fs");
const path = require("path");

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
  return {
    dryRun: argv.includes("--dry-run"),
  };
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

  const previewSql = `
    select
      u.id,
      u.email,
      coalesce(u.raw_user_meta_data->>'name', u.email) as resolved_name,
      pu.name as current_public_name,
      pp.name as current_profile_name
    from auth.users u
    left join public.users pu on pu.id = u.id
    left join public.profiles pp on pp.id = u.id
    where pu.id is null
       or pp.id is null
       or pu.name is distinct from coalesce(u.raw_user_meta_data->>'name', u.email)
       or pp.name is distinct from coalesce(u.raw_user_meta_data->>'name', u.email)
       or pu.avatar_url is distinct from u.raw_user_meta_data->>'avatar_url'
       or pp.avatar_url is distinct from u.raw_user_meta_data->>'avatar_url'
    order by u.created_at desc;
  `;

  const upsertProfilesSql = `
    insert into public.profiles (id, name, avatar_url)
    select
      u.id,
      coalesce(u.raw_user_meta_data->>'name', u.email),
      u.raw_user_meta_data->>'avatar_url'
    from auth.users u
    on conflict (id) do update
      set name = excluded.name,
          avatar_url = excluded.avatar_url;
  `;

  const upsertUsersSql = `
    insert into public.users (id, name, avatar_url)
    select
      u.id,
      coalesce(u.raw_user_meta_data->>'name', u.email),
      u.raw_user_meta_data->>'avatar_url'
    from auth.users u
    on conflict (id) do update
      set name = excluded.name,
          avatar_url = excluded.avatar_url;
  `;

  try {
    await client.connect();

    const preview = await client.query(previewSql);
    if (preview.rows.length === 0) {
      console.log("✅ public.users และ public.profiles ตรงกับ auth.users แล้ว");
      return;
    }

    console.log(`พบ ${preview.rows.length} รายการที่ต้อง resync`);
    console.table(
      preview.rows.slice(0, 20).map((row) => ({
        email: row.email,
        resolved_name: row.resolved_name,
        current_public_name: row.current_public_name,
        current_profile_name: row.current_profile_name,
      }))
    );

    if (options.dryRun) {
      console.log("ℹ️ dry-run: ยังไม่ได้อัปเดตข้อมูลจริง");
      return;
    }

    await client.query("begin");
    await client.query(upsertProfilesSql);
    await client.query(upsertUsersSql);
    await client.query("commit");

    console.log("✅ resync auth.users -> public.profiles/public.users สำเร็จ");
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore rollback errors
    }
    console.error("❌ resync auth users ล้มเหลว:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
