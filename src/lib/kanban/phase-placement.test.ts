import { describe, it, expect } from "vitest";
import { getKanbanPhaseIdsForOrder } from "./phase-placement";
import type { KanbanOrderItem } from "@/lib/data/kanban-types";

function makeOrder(overrides: Partial<KanbanOrderItem>): KanbanOrderItem {
  return {
    id: "test-id",
    number: "001",
    budgetReference: null,
    status: "transporte_perfil",
    type: "final",
    measurementStatus: "medida",
    clientName: "Cliente",
    priority: "normal",
    scheduledDate: null,
    updatedAt: new Date(),
    hasMeasurement: true,
    cuttingSteps: null,
    transportSteps: null,
    installationSteps: null,
    ...overrides,
  };
}

describe("getKanbanPhaseIdsForOrder", () => {
  it("mantém OS na coluna transporte enquanto entregas pendentes", () => {
    const phases = getKanbanPhaseIdsForOrder(
      makeOrder({
        status: "transporte_levar_vidro",
        transportSteps: {
          levarPerfilEstrutural: true,
          levarPerfilTotal: true,
          levarAcessorios: true,
          levarVidros: false,
          transporteConcluido: false,
        },
      }),
    );

    expect(phases).toContain("transporte");
    expect(phases).toContain("instalacao");
  });

  it("remove OS da coluna transporte quando transporte concluído", () => {
    const phases = getKanbanPhaseIdsForOrder(
      makeOrder({
        status: "transporte_levar_vidro",
        transportSteps: {
          levarPerfilEstrutural: true,
          levarPerfilTotal: true,
          levarAcessorios: true,
          levarVidros: true,
          transporteConcluido: true,
        },
      }),
    );

    expect(phases).not.toContain("transporte");
    expect(phases).toContain("instalacao");
  });

  it("mantém OS em instalação quando o status já avançou", () => {
    const phases = getKanbanPhaseIdsForOrder(
      makeOrder({
        status: "instalacao_estrutural",
        transportSteps: null,
        installationSteps: {
          instalacaoEstruturalFeita: false,
          instalacaoVidrosFeita: false,
          instalacaoAcabamentoFeito: false,
        },
      }),
    );

    expect(phases).toEqual(["instalacao"]);
  });

  it("remove OS da coluna instalação quando instalação concluída", () => {
    const phases = getKanbanPhaseIdsForOrder(
      makeOrder({
        status: "instalacao_vidros",
        installationSteps: {
          instalacaoEstruturalFeita: true,
          instalacaoVidrosFeita: true,
          instalacaoAcabamentoFeito: true,
        },
      }),
    );

    expect(phases).not.toContain("instalacao");
    expect(phases).toContain("concluidos");
  });

  it("envia OS em transporte paralelo para concluídos quando instalação concluída", () => {
    const phases = getKanbanPhaseIdsForOrder(
      makeOrder({
        status: "transporte_levar_vidro",
        transportSteps: {
          levarPerfilEstrutural: true,
          levarPerfilTotal: true,
          levarAcessorios: true,
          levarVidros: true,
          transporteConcluido: true,
        },
        installationSteps: {
          instalacaoEstruturalFeita: true,
          instalacaoVidrosFeita: true,
          instalacaoAcabamentoFeito: true,
        },
      }),
    );

    expect(phases).not.toContain("instalacao");
    expect(phases).toContain("concluidos");
  });
});
