import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  TRANSPORT_STEPS,
  getVaoStepAssignment,
} from "@/lib/logistics/transport-step-assignment";

/**
 * Aplica o mesmo motorista a todas as etapas de todos os vãos,
 * preservando data e veículo já resolvidos em cada etapa.
 */
export function applyDriverToAllVaoSteps(
  items: MeasurementLineItem[],
  driverId: string | null,
): MeasurementLineItem[] {
  return items.map((item) => {
    const prev = item.transportProgress ?? {
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
    };

    const stepAssignments = { ...prev.stepAssignments };
    for (const step of TRANSPORT_STEPS) {
      const current = getVaoStepAssignment(item, step);
      stepAssignments[step] = {
        driverId,
        scheduledDate: current.scheduledDate,
        vehicleId: current.vehicleId,
      };
    }

    return {
      ...item,
      transportProgress: {
        ...prev,
        stepAssignments,
      },
    };
  });
}

/**
 * Aplica a mesma data a todas as etapas de todos os vãos,
 * preservando motorista e veículo já resolvidos em cada etapa.
 */
export function applyScheduledDateToAllVaoSteps(
  items: MeasurementLineItem[],
  scheduledDate: string | null,
): MeasurementLineItem[] {
  return items.map((item) => {
    const prev = item.transportProgress ?? {
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
    };

    const stepAssignments = { ...prev.stepAssignments };
    for (const step of TRANSPORT_STEPS) {
      const current = getVaoStepAssignment(item, step);
      stepAssignments[step] = {
        driverId: current.driverId,
        scheduledDate,
        vehicleId: current.vehicleId,
      };
    }

    return {
      ...item,
      transportProgress: {
        ...prev,
        stepAssignments,
      },
    };
  });
}

/**
 * Aplica o mesmo veículo a todas as etapas de todos os vãos,
 * preservando motorista e data já resolvidos em cada etapa.
 */
export function applyVehicleToAllVaoSteps(
  items: MeasurementLineItem[],
  vehicleId: string | null,
): MeasurementLineItem[] {
  return items.map((item) => {
    const prev = item.transportProgress ?? {
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
    };

    const stepAssignments = { ...prev.stepAssignments };
    for (const step of TRANSPORT_STEPS) {
      const current = getVaoStepAssignment(item, step);
      stepAssignments[step] = {
        driverId: current.driverId,
        scheduledDate: current.scheduledDate,
        vehicleId,
      };
    }

    return {
      ...item,
      transportProgress: {
        ...prev,
        stepAssignments,
      },
    };
  });
}
