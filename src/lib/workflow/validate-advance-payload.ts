import type { AdvanceTargetStatus } from "./advance-flow";
import {
  cutsSchema,
  dimensionsSchema,
  installationPhotosSchema,
  transportItemsCheckedSchema,
} from "./schemas";
import {
  isAccessoriesComplete,
  isPackagingComplete,
  isTransportStepComplete,
} from "./status-machine";
import { validateBiometricConfirmation } from "@/lib/auth/verify-biometric-confirmation";
import { getSession } from "@/lib/auth/session";

export type AdvanceStepContext = {
  hasFinalMeasurement: boolean;
  cuttingPlan: {
    cuts: unknown[] | null;
    status: string | null;
    packaging: Record<string, boolean> | null;
    accessories: Record<string, number> | null;
  } | null;
  transportItemsChecked: Record<string, boolean> | null;
  installation: {
    photos: { before?: string[]; after?: string[] } | null;
  } | null;
};

export async function validateAdvancePayload(
  nextStatus: AdvanceTargetStatus,
  payload: Record<string, unknown> | undefined,
  ctx: AdvanceStepContext,
  osId?: string,
): Promise<string | null> {
  const p = payload ?? {};

  if (osId != null) {
    const session = await getSession();
    const biometricError = validateBiometricConfirmation(
      nextStatus,
      osId,
      payload,
      session?.userId,
    );
    if (biometricError) return biometricError;
  }

  if (nextStatus === "medicao_final") {
    if (p.dimensions && !dimensionsSchema.safeParse(p.dimensions).success) {
      return "Dimensões inválidas";
    }
    if (!p.dimensions && !ctx.hasFinalMeasurement) {
      return "Registre a medição (dimensões e fotos)";
    }
    return null;
  }

  if (nextStatus === "cortes") {
    const cuts = p.cuts ?? ctx.cuttingPlan?.cuts;
    if (!cuts || !cutsSchema.safeParse(cuts).success) {
      return "Preencha o plano de corte antes de iniciar";
    }
    if (!ctx.hasFinalMeasurement) {
      return "Vincule a medição final antes de liberar o corte";
    }
    return null;
  }

  if (nextStatus === "embalagem") {
    const cuts = p.cuts ?? ctx.cuttingPlan?.cuts;
    if (!cuts || !cutsSchema.safeParse(cuts).success) {
      return "Informe os itens do plano de corte";
    }
    const packaging = (p.packaging ?? ctx.cuttingPlan?.packaging) as
      | Record<string, boolean>
      | undefined;
    if (!isPackagingComplete(packaging)) {
      return "Complete o checklist de embalagem";
    }
    return null;
  }

  if (nextStatus === "acessorios_plano") {
    const accessories = (p.accessories ?? ctx.cuttingPlan?.accessories) as
      | Record<string, number>
      | undefined;
    if (!isAccessoriesComplete(accessories)) {
      return "Registre os acessórios do plano de corte";
    }
    return null;
  }

  if (nextStatus === "transporte_perfil") {
    const vehicleId = p.vehicleId as string | undefined;
    if (!vehicleId) {
      return "Selecione o veículo do transporte";
    }
    return null;
  }

  if (
    nextStatus === "transporte_estrutural" ||
    nextStatus === "transporte_perfis_total" ||
    nextStatus === "transporte_acessorios" ||
    nextStatus === "transporte_levar_vidro"
  ) {
    const checked = (p.itemsChecked ?? ctx.transportItemsChecked) as
      | Record<string, boolean>
      | undefined;
    if (!checked || !transportItemsCheckedSchema.safeParse(checked).success) {
      return "Confirme o item do checklist de transporte";
    }
    if (!isTransportStepComplete(checked, nextStatus)) {
      return "Marque o item correspondente no checklist de transporte";
    }
    return null;
  }

  if (nextStatus === "concluido") {
    const photos = (p.photos ?? ctx.installation?.photos) as
      | { before?: string[]; after?: string[] }
      | undefined;
    if (!photos || !installationPhotosSchema.safeParse(photos).success) {
      return "Instalação exige fotos antes e depois";
    }
    return null;
  }

  return null;
}
