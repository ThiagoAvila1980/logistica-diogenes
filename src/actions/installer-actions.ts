"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { getServiceOrderById } from "@/lib/data/orders";

const assignInstallerSchema = z.object({
  osId: z.string().uuid(),
  installerId: z.string().uuid().nullable(),
  scheduledInstallationDate: z.string().nullable(),
});

export type AssignInstallerResult =
  | { success: true }
  | { success: false; message: string };

export async function assignInstallerToOsAction(
  raw: z.infer<typeof assignInstallerSchema>,
): Promise<AssignInstallerResult> {
  const parsed = assignInstallerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Requisição inválida. Recarregue a página e tente novamente.",
    };
  }

  try {
    await requireRole(["admin", "gerente"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, installerId, scheduledInstallationDate } = parsed.data;

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const { assignInstallerToInstallationDb } = await import(
      "@/lib/data/installers-db"
    );

    const parsedDate = scheduledInstallationDate
      ? new Date(scheduledInstallationDate)
      : null;

    if (parsedDate && isNaN(parsedDate.getTime())) {
      return { success: false, message: "Data inválida" };
    }

    await assignInstallerToInstallationDb(osId, installerId, parsedDate);
    revalidateOSRoutes(osId);
    return { success: true };
  } catch (err) {
    console.error("[assignInstallerToOsAction]", err);
    return { success: false, message: "Erro ao atribuir instalador" };
  }
}
