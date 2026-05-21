import postgres from "postgres";

const ref = "neancgwxlyhlzgtagciv";
const pass = "Ai9qJRq5M28I8q8m";
const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-central-1",
  "ap-southeast-1", "ap-northeast-1", "sa-east-1",
];

for (const prefix of ["aws-0", "aws-1"]) {
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      const url = `postgresql://postgres.${ref}:${pass}@${host}:${port}/postgres`;
      const sql = postgres(url, { prepare: false, ssl: "require", max: 1, connect_timeout: 5 });
      try {
        await sql`select 1 as ok`;
        console.log("OK", host, port);
        await sql.end();
        process.exit(0);
      } catch (e) {
        const msg = e.message;
        if (!msg.includes("ENOTFOUND") && !msg.includes("Tenant") && !msg.includes("tenant")) {
          console.log("OTHER", host, port, msg);
        }
      } finally {
        await sql.end({ timeout: 1 }).catch(() => {});
      }
    }
  }
}
console.log("Nenhuma combinação funcionou");
