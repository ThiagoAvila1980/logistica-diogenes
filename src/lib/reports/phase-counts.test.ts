import { describe, it, expect } from "vitest";
import { countOrdersByKanbanPhase } from "./phase-counts";
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

describe("countOrdersByKanbanPhase", () => {
  it("conta instalação e concluídos com a mesma regra do kanban", () => {
    const orders: KanbanOrderItem[] = [
      makeOrder({
        id: "1",
        status: "transporte_levar_vidro",
        transportSteps: {
          levarPerfilEstrutural: true,
          levarPerfilTotal: true,
          levarAcessorios: true,
          levarVidros: false,
          transporteConcluido: false,
        },
      }),
      makeOrder({
        id: "2",
        status: "instalacao_vidros",
        installationSteps: {
          instalacaoEstruturalFeita: true,
          instalacaoVidrosFeita: true,
          instalacaoAcabamentoFeito: true,
        },
      }),
      makeOrder({
        id: "3",
        status: "concluido",
      }),
    ];

    const counts = Object.fromEntries(
      countOrdersByKanbanPhase(orders).map((p) => [p.phaseId, p.count]),
    );

    expect(counts.transporte).toBe(1);
    expect(counts.instalacao).toBe(1);
    expect(counts.concluidos).toBe(2);
  });

  it("expõe rótulos legíveis de instalação e concluídos", () => {
    const byPhase = countOrdersByKanbanPhase([
      makeOrder({ id: "1", status: "concluido" }),
    ]);

    expect(byPhase.find((p) => p.phaseId === "instalacao")?.phaseTitle).toBe(
      "Instalação",
    );
    expect(byPhase.find((p) => p.phaseId === "concluidos")?.phaseTitle).toBe(
      "Concluídos",
    );
  });
});
