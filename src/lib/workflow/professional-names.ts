import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export async function resolveUserNamesByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const db = getDb();
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, uniqueIds));

  return new Map(rows.map((row) => [row.id, row.name]));
}

/** Nomes únicos, ordenados de inserção, separados por vírgula. */
export function formatUniqueNamesCommaSeparated(
  names: Array<string | null | undefined>,
): string | null {
  const unique = [...new Set(names.filter((name): name is string => Boolean(name?.trim())))];
  return unique.length > 0 ? unique.join(", ") : null;
}

export function namesFromIds(
  ids: Array<string | null | undefined>,
  nameById: Map<string, string>,
): string | null {
  return formatUniqueNamesCommaSeparated(
    ids.map((id) => (id ? nameById.get(id) : null)),
  );
}
