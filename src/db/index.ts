import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl, isRemoteSupabaseUrl } from "./env";
import * as schema from "./schema";

type FluxoDb = ReturnType<typeof drizzle<typeof schema>>;

let instance: FluxoDb | null = null;

export function getDb(): FluxoDb {
  if (instance) return instance;

  const connectionString = getDatabaseUrl();
  const client = postgres(connectionString, {
    prepare: false,
    ssl: isRemoteSupabaseUrl(connectionString) ? "require" : undefined,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  instance = drizzle(client, { schema });
  return instance;
}