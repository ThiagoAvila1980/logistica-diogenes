"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { getServiceOrderById } from "@/lib/data/orders";
import { getSession } from "@/lib/auth/session";
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
  osId: string,
  servicePhotos: string[],
  installerId?: string,
): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ id: installationLogs.id, photos: installationLogs.photos })
    .from(installationLogs)
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  const photos: InstallationPhotos = {
    ...existing?.photos,
    service: servicePhotos,
  };

  if (existing) {
    await db
      .update(installationLogs)
      .set({ photos, installerId: installerId ?? null })
      .where(eq(installationLogs.id, existing.id));
  } else {
    await db.insert(installationLogs).values({
      idMedicao: osId,
      photos,
      installerId: installerId ?? null,
    });
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

  try {
    await requireRole(["admin", "gerente", "instalador"]);
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

  if (useMockData()) {
    const result = mockRepository.saveInstallationServicePhotos(
      osId,
      photos,
    );
    if (!result.success) return result;
    revalidatePath("/installation");
    revalidatePath(`/installation/${osId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Fotos salvas." };
  }

  try {
    const session = await getSession();
    await upsertInstallationServicePhotosDb(
      osId,
      photos,
      session?.userId,
    );
    revalidatePath("/installation");
    revalidatePath(`/installation/${osId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Fotos salvas." };
  } catch {
    return { success: false, message: "Erro ao salvar fotos." };
  }
}

async function upsertInstallationDailyNoteDb(
  osId: string,
  note: InstallationDailyNote,
  installerId?: string,
): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ id: installationLogs.id, dailyNotes: installationLogs.dailyNotes })
    .from(installationLogs)
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  const currentNotes = existing?.dailyNotes ?? [];
  const index = currentNotes.findIndex((entry) => entry.date === note.date);
  const nextNotes =
    index >= 0
      ? currentNotes.map((entry, i) => (i === index ? note : entry))
      : [...currentNotes, note].sort((a, b) => b.date.localeCompare(a.date));

  if (existing) {
    await db
      .update(installationLogs)
      .set({ dailyNotes: nextNotes, installerId: installerId ?? null })
      .where(eq(installationLogs.id, existing.id));
  } else {
    await db.insert(installationLogs).values({
      idMedicao: osId,
      dailyNotes: nextNotes,
      installerId: installerId ?? null,
    });
  }
}

async function assertCanSaveInstallationData(osId: string): Promise<
  | { ok: true }
  | { ok: false; message: string }
> {
  try {
    await requireRole(["admin", "gerente", "instalador"]);
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

  return { ok: true };
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

  if (useMockData()) {
    const result = mockRepository.saveInstallationDailyNote(osId, date, text);
    if (!result.success) return result;

    revalidatePath("/installation");
    revalidatePath(`/installation/${osId}`);
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Observação salva.",
      note: result.note,
    };
  }

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

  try {
    const db = getDb();
    const [existing] = await db
      .select({ dailyNotes: installationLogs.dailyNotes })
      .from(installationLogs)
      .where(eq(installationLogs.idMedicao, osId))
      .limit(1);

    const previous = existing?.dailyNotes?.find((entry) => entry.date === date);
    const note: InstallationDailyNote = {
      date,
      text,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    const session = await getSession();
    await upsertInstallationDailyNoteDb(osId, note, session?.userId);

    revalidatePath("/installation");
    revalidatePath(`/installation/${osId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Observação salva.", note };
  } catch {
    return { success: false, message: "Erro ao salvar observação." };
  }
}
