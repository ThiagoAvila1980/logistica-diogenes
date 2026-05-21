import postgres from "postgres";

const password = "Ai9qJRq5M28I8q8m";
const ref = "neancgwxlyhlzgtagciv";

const urls = [
  [
    "pooler 6543",
    `postgresql://postgres.${ref}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ],
  [
    "pooler 5432",
    `postgresql://postgres.${ref}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  ],
];

for (const [label, url] of urls) {
  const sql = postgres(url, {
    prepare: false,
    ssl: "require",
    max: 1,
    connect_timeout: 10,
  });
  try {
    const [row] = await sql`select current_user as user, 1 as ok`;
    console.log(`OK  ${label}`, row);
  } catch (e) {
    console.log(`FAIL ${label}:`, e.message);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}
