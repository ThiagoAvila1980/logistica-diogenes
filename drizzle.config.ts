import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";
import { getDirectDatabaseUrl } from "./src/db/env";

config({ path: resolve(process.cwd(), ".env.local") });
config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getDirectDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});
