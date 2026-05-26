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
import { installationLogs } from "@/db/schema";
import type { InstallationPhotos } from "@/lib/workflow/schemas";

export type SaveInstallationServicePhotosResult =
  | { success: true; message: string }
  | { success: false; message: string };

const servicePhotosSchema = z.object({
  osId: z.string().uuid(),
  photos: z.array(z.string().min(1)),
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

  if (
    !order.status.startsWith("instalacao") &&
    order.status !== "concluido"
  ) {
    return {
      success: false,
      message: "Esta OS não está em etapa de instalação.",
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
