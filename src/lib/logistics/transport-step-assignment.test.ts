import { describe, expect, it } from "vitest";
import { getVaoStepAssignment, collectVaoStepDriverIds } from "./transport-step-assignment";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

function makeItem(
  transportProgress: MeasurementLineItem["transportProgress"],
): Pick<MeasurementLineItem, "transportProgress"> {
  return { transportProgress };
}

describe("transport-step-assignment", () => {
  it("usa o motorista/data legado do vão como padrão quando não há stepAssignments", () => {
    const item = makeItem({
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
      driverId: "m1",
      scheduledTransportDate: "2026-01-10",
    });

    expect(getVaoStepAssignment(item, "perfilEstrutural")).toEqual({
      driverId: "m1",
      scheduledDate: "2026-01-10",
      vehicleId: null,
    });
    expect(getVaoStepAssignment(item, "vidros")).toEqual({
      driverId: "m1",
      scheduledDate: "2026-01-10",
      vehicleId: null,
    });
  });

  it("usa o veículo legado do vão como padrão quando não há stepAssignments", () => {
    const item = makeItem({
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
      vehicleId: "v1",
      driverId: "m1",
      scheduledTransportDate: "2026-01-10",
    });

    expect(getVaoStepAssignment(item, "perfilEstrutural")).toEqual({
      driverId: "m1",
      scheduledDate: "2026-01-10",
      vehicleId: "v1",
    });
  });

  it("prioriza o stepAssignments explícito sobre o valor legado do vão", () => {
    const item = makeItem({
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
      driverId: "m1",
      scheduledTransportDate: "2026-01-10",
      vehicleId: "v1",
      stepAssignments: {
        vidros: { driverId: "m2", scheduledDate: "2026-01-15", vehicleId: "v2" },
      },
    });

    expect(getVaoStepAssignment(item, "vidros")).toEqual({
      driverId: "m2",
      scheduledDate: "2026-01-15",
      vehicleId: "v2",
    });
    // Etapa não sobrescrita continua usando o valor legado.
    expect(getVaoStepAssignment(item, "perfilEstrutural")).toEqual({
      driverId: "m1",
      scheduledDate: "2026-01-10",
      vehicleId: "v1",
    });
  });

  it("respeita limpeza explícita (null) de um item, sem voltar ao valor legado", () => {
    const item = makeItem({
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
      driverId: "m1",
      scheduledTransportDate: "2026-01-10",
      vehicleId: "v1",
      stepAssignments: {
        vidros: { driverId: null, scheduledDate: null, vehicleId: null },
      },
    });

    expect(getVaoStepAssignment(item, "vidros")).toEqual({
      driverId: null,
      scheduledDate: null,
      vehicleId: null,
    });
  });

  it("em stepAssignments antigo sem vehicleId, usa o veículo legado do vão", () => {
    const item = makeItem({
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
      vehicleId: "v1",
      stepAssignments: {
        vidros: { driverId: "m2", scheduledDate: "2026-01-15" },
      },
    });

    expect(getVaoStepAssignment(item, "vidros")).toEqual({
      driverId: "m2",
      scheduledDate: "2026-01-15",
      vehicleId: "v1",
    });
  });

  it("coleta motoristas únicos entre todos os itens de ticagem do vão", () => {
    const item = makeItem({
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
      driverId: "m1",
      stepAssignments: {
        vidros: { driverId: "m2", scheduledDate: null },
        acessorios: { driverId: "m1", scheduledDate: null },
      },
    });

    expect(collectVaoStepDriverIds(item)).toEqual(["m1", "m2"]);
  });
});
