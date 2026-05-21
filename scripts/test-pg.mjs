import pg from "pg";

const passwords = ["Ai9qJRq5M28I8q8m", "qtSd0QWGZ6mOMNGG"];
const ref = "neancgwxlyhlzgtagciv";

const templates = (password) => [
  [
    "pooler ref user 6543",
    `postgresql://postgres.${ref}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ],
  [
    "pooler postgres + options 6543",
    `postgresql://postgres:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3D${ref}`,
  ],
  [
    "pooler postgres + options 5432",
    `postgresql://postgres:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?options=project%3D${ref}`,
  ],
];

for (const password of passwords) {
  console.log(`\n--- password ${password.slice(0, 3)}*** ---`);
  for (const [label, connectionString] of templates(password)) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      const result = await client.query("select current_user, 1 as ok");
      console.log(`OK  ${label}`, result.rows[0]);
    } catch (e) {
      console.log(`FAIL ${label}:`, e.message);
    } finally {
      await client.end().catch(() => {});
    }
  }
}
