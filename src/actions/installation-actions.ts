"use server";

import { eq } from "drizzle-orm";
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceOrderById } from "@/lib/data/orders";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db";
import { installationLogs, measurements } from "@/db/schema";
import type { InstallationPhotos, InstallationDailyNote, MeasurementLineItem } from "@/lib/workflow/schemas";
import { installationDailyNoteSchema } from "@/lib/workflow/schemas";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import {
  aggregateCuttingStepsFromItems,
  effectiveCuttingSteps,
  isInstallationOrLater,
} from "@/lib/workflow/aggregates";

export type SaveInstallationServicePhotosResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type SaveInstallationDailyNoteResult =
  | { success: true; message: string; note: InstallationDailyNote }
  | { success: false; message: string };

const servicePhotosSchema = z.object({
  osId: z.string().uuid(),
  photos: z.array(z.string().min(1)),
});

const saveDailyNoteSchema = z.object({
  osId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  text: z.string().trim().min(1, "Descreva o que foi feito no dia.").max(2000),
});

async function upsertInstallationServicePhotosDb(
  tx: any,
  osId: string,
  servicePhotos: string[],
): Promise<void> {
  const [existing] = await tx
    .select({ id: installationLogs.id, photos: installationLogs.photos })
    .from(installationLogs)
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  const photos: InstallationPhotos = {
    ...existing?.photos,
    service: servicePhotos,
  };

  if (existing) {
    await tx
      .update(installationLogs)
      .set({ photos })
      .where(eq(installationLogs.id, existing.id));
  } else {
    await tx.insert(installationLogs).values({ idMedicao: osId, photos });
  }
}

export async function saveInstallationServicePhotos(
  osId: string,
  photos: string[],
): Promise<SaveInstallationServicePhotosResult> {
  const parsed = servicePhotosSchema.safeParse({ osId, photos });
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos." };
  }

  let session;
  try {
    session = await requireRole(["admin", "gerente", "instalador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação." };
  }

  const order = await getServiceOrderById(osId);
  if (!order) {
    return { success: false, message: "OS não encontrada." };
  }

  const db = getDb();

  const [measRow] = await db
    .select({ items: measurements.items })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);

  const items = (measRow?.items as MeasurementLineItem[]) ?? [];
  const cuttingSteps = effectiveCuttingSteps(
    aggregateCuttingStepsFromItems(items),
    isInstallationOrLater(order.status),
  );

  if (!canOperateInstallationModule(order.status, cuttingSteps)) {
    return {
      success: false,
      message: "Aguardando conclusão do corte para liberar instalação.",
    };
  }

  try {
    await db.transaction(async (tx) => {
      await upsertInstallationServicePhotosDb(tx, osId, photos);
      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.INSTALLATION_PHOTOS_UPDATED,
        measurementId: osId,
      });
    });
    revalidatePath("/installation");
    revalidatePath(`/installation/${osId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Fotos salvas." };
  } catch {
    return { success: false, message: "Erro ao salvar fotos." };
  }
}

async function upsertInstallationDailyNoteDb(
  tx: any,
  osId: string,
  note: InstallationDailyNote,
): Promise<void> {
  const [existing] = await tx
    .select({ id: installationLogs.id, dailyNotes: installationLogs.dailyNotes })
    .from(installationLogs)
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  const currentNotes: InstallationDailyNote[] = (existing?.dailyNotes as InstallationDailyNote[]) ?? [];
  const index = currentNotes.findIndex((entry) => entry.date === note.date);
  const nextNotes =
    index >= 0
      ? currentNotes.map((entry, i) => (i === index ? note : entry))
      : [...currentNotes, note].sort((a, b) => b.date.localeCompare(a.date));

  if (existing) {
    await tx
      .update(installationLogs)
      .set({ dailyNotes: nextNotes })
      .where(eq(installationLogs.id, existing.id));
  } else {
    await tx.insert(installationLogs).values({ idMedicao: osId, dailyNotes: nextNotes });
  }
}

async function assertCanSaveInstallationData(osId: string): Promise<
  | { ok: true; session: any }
  | { ok: false; message: string }
> {
  let session;
  try {
    session = await requireRole(["admin", "gerente", "instalador"]);
  } catch {
    return { ok: false, message: "Sem permissão para esta ação." };
  }

  const order = await getServiceOrderById(osId);
  if (!order) {
    return { ok: false, message: "OS não encontrada." };
  }

  const db = getDb();
  const [measRow] = await db
    .select({ items: measurements.items })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);

  const items = (measRow?.items as MeasurementLineItem[]) ?? [];
  const cuttingSteps = effectiveCuttingSteps(
    aggregateCuttingStepsFromItems(items),
    isInstallationOrLater(order.status),
  );

  if (!canOperateInstallationModule(order.status, cuttingSteps)) {
    return {
      ok: false,
      message: "Aguardando conclusão do corte para liberar instalação.",
    };
  }

  return { ok: true, session };
}

export async function saveInstallationDailyNote(input: {
  osId: string;
  date: string;
  text: string;
}): Promise<SaveInstallationDailyNoteResult> {
  const parsed = saveDailyNoteSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return { success: false, message: firstIssue ?? "Dados inválidos." };
  }

  const { osId, date, text } = parsed.data;

  const gate = await assertCanSaveInstallationData(osId);
  if (!gate.ok) return { success: false, message: gate.message };

  const now = new Date().toISOString();
  const noteCandidate = {
    date,
    text,
    createdAt: now,
    updatedAt: now,
  };
  const validatedNote = installationDailyNoteSchema.safeParse(noteCandidate);
  if (!validatedNote.success) {
    return { success: false, message: "Dados inválidos." };
  }

  let finalNote: InstallationDailyNote | undefined;
  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ dailyNotes: installationLogs.dailyNotes })
        .from(installationLogs)
        .where(eq(installationLogs.idMedicao, osId))
        .limit(1);

      const previous = (existing?.dailyNotes as InstallationDailyNote[])?.find((entry) => entry.date === date);
      const note: InstallationDailyNote = {
        date,
        text,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      finalNote = note;

      await upsertInstallationDailyNoteDb(tx, osId, note);

      await recordAuditEvent(tx, {
        actorId: gate.session.userId,
        action: AUDIT_ACTIONS.INSTALLATION_NOTES_UPDATED,
        measurementId: osId,
        payload: { date },
      });
    });

    revalidatePath("/installation");
    revalidatePath(`/installation/${osId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Observação salva.", note: finalNote! };
  } catch {
    return { success: false, message: "Erro ao salvar observação." };
  }
}
