import postgres from "postgres";

const password = "Ai9qJRq5M28I8q8m";

for (const host of [
  "2600:1f14:2c31:7602:4460:99a4:a806:eab6",
  "[2600:1f14:2c31:7602:4460:99a4:a806:eab6]",
  "db.neancgwxlyhlzgtagciv.supabase.co",
]) {
  const sql = postgres({
    host,
    port: 5432,
    username: "postgres",
    password,
    database: "postgres",
    ssl: "require",
    prepare: false,
    max: 1,
    connect_timeout: 15,
  });

  try {
    const [row] = await sql`select current_user as user`;
    console.log(`OK host=${host}`, row);
  } catch (e) {
    console.log(`FAIL host=${host}:`, e.message);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}
