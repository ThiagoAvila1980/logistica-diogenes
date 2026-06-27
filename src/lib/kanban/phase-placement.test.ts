import { describe, it, expect } from "vitest";
import {
  getKanbanPhaseIdsForOrder,
  KANBAN_CONCLUDED_COLUMN_LIMIT,
  placeKanbanOrders,
} from "./phase-placement";
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

describe("placeKanbanOrders", () => {
  const completedInstallationSteps = {
    instalacaoEstruturalFeita: true,
    instalacaoVidrosFeita: true,
    instalacaoAcabamentoFeito: true,
  };

  it("limita a coluna concluídos aos 15 serviços mais recentes", () => {
    const orders = Array.from({ length: 20 }, (_, index) =>
      makeOrder({
        id: `os-${index}`,
        number: String(index + 1).padStart(3, "0"),
        status: "concluido",
        updatedAt: new Date(Date.UTC(2026, 0, index + 1)),
      }),
    );

    const grouped = placeKanbanOrders(orders);

    expect(grouped.concluidos).toHaveLength(KANBAN_CONCLUDED_COLUMN_LIMIT);
    expect(grouped.concluidos.map((item) => item.os.id)).toEqual([
      "os-19",
      "os-18",
      "os-17",
      "os-16",
      "os-15",
      "os-14",
      "os-13",
      "os-12",
      "os-11",
      "os-10",
      "os-9",
      "os-8",
      "os-7",
      "os-6",
      "os-5",
    ]);
  });

  it("ordena concluídos do mais recente para o mais antigo", () => {
    const orders = [
      makeOrder({
        id: "old",
        status: "instalacao_vidros",
        updatedAt: new Date("2026-01-01T10:00:00Z"),
        installationSteps: completedInstallationSteps,
      }),
      makeOrder({
        id: "new",
        status: "concluido",
        updatedAt: new Date("2026-06-01T10:00:00Z"),
      }),
      makeOrder({
        id: "mid",
        status: "concluido",
        updatedAt: new Date("2026-03-01T10:00:00Z"),
      }),
    ];

    const grouped = placeKanbanOrders(orders);

    expect(grouped.concluidos.map((item) => item.os.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });
});
