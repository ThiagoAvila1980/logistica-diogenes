"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/require-role";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getServiceOrderById } from "@/lib/data/orders";
import { getDb } from "@/lib/db";
import { measurements } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { logger } from "@/lib/logger";

export type AssignInstallerResult =
  | { success: true }
  | { success: false; message: string };

const assignInstallerToVaoSchema = z.object({
  osId: z.string().uuid(),
  itemId: z.string().min(1),
  installerId: z.string().uuid().nullable(),
  scheduledInstallationDate: z.string().nullable(),
});

export async function assignInstallerToVaoAction(
  raw: z.infer<typeof assignInstallerToVaoSchema>,
): Promise<AssignInstallerResult> {
  const parsed = assignInstallerToVaoSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: "Requisição inválida. Recarregue a página e tente novamente." };
  }

  try {
    await requireRole(["admin", "gerente"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, itemId, installerId, scheduledInstallationDate } = parsed.data;

  if (scheduledInstallationDate) {
    const d = new Date(scheduledInstallationDate);
    if (isNaN(d.getTime())) return { success: false, message: "Data inválida" };
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();

    await db.transaction(async (tx) => {
      const [meas] = await tx
        .select({ items: measurements.items })
        .from(measurements)
        .where(eq(measurements.id, osId))
        .for("update")
        .limit(1);

      if (!meas) throw new Error("OS não encontrada");

      const items = (meas.items as MeasurementLineItem[]) ?? [];
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx === -1) throw new Error("Vão não encontrado");

      const updatedItems = items.map((i) => {
        if (i.id !== itemId) return i;
        const prev = i.installationProgress ?? { estrutural: false, vidros: false, acabamento: false };
        return {
          ...i,
          installationProgress: {
            ...prev,
            installerId: installerId ?? null,
            scheduledInstallationDate: scheduledInstallationDate ?? null,
          },
        };
      });

      await tx
        .update(measurements)
        .set({ items: updatedItems, updatedAt: new Date() })
        .where(eq(measurements.id, osId));
    });

    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    logger.error("assignInstallerToVaoAction failed", { osId, itemId, err });
    return { success: false, message: "Erro ao atribuir instalador ao vão" };
  }
}
