import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { installationLogs } from "@/db/schema";
import type { InstallationDraft } from "./installation";

export async function getInstallationDraftDb(
  osId: string,
): Promise<InstallationDraft | undefined> {
  const db = getDb();
  const [row] = await db
    .select({
      notes: installationLogs.notes,
      photos: installationLogs.photos,
      structuralInstalled: installationLogs.structuralInstalled,
      glassInstalled: installationLogs.glassInstalled,
      finalCompleted: installationLogs.finalCompleted,
    })
    .from(installationLogs)
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  if (!row) return undefined;

  return {
    notes: row.notes ?? undefined,
    photosBefore: row.photos?.before ?? [],
    photosAfter: row.photos?.after ?? [],
    structuralInstalled: row.structuralInstalled,
    glassInstalled: row.glassInstalled,
    finalCompleted: row.finalCompleted,
  };
}

export async function upsertInstallationDraftDb(
  osId: string,
  data: {
    notes: string | null;
    photos: { before: string[]; after: string[] };
    installerId?: string;
  },
): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ id: installationLogs.id })
    .from(installationLogs)
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  const values = {
    notes: data.notes,
    photos: data.photos,
    installerId: data.installerId ?? null,
  };

  if (existing) {
    await db
      .update(installationLogs)
      .set(values)
      .where(eq(installationLogs.id, existing.id));
  } else {
    await db.insert(installationLogs).values({ idMedicao: osId, ...values });
  }
}
