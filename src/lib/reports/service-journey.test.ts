import { describe, expect, it } from "vitest";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import { buildServiceJourneyRow } from "@/lib/reports/service-journey";
import {
  DEFAULT_SERVICE_REPORT_FILTERS,
  filterServiceJourneyRows,
} from "@/lib/reports/service-report-filters";

function baseOrder(overrides: Partial<KanbanOrderItem> = {}): KanbanOrderItem {
  return {
    id: "test-id",
    number: "OS-2026-00099",
    budgetReference: "ORC-999",
    status: "transporte_perfil",
    type: "final",
    measurementStatus: "medida",
    priority: "normal",
    clientName: "Cliente Teste",
    scheduledDate: new Date("2026-06-01"),
    updatedAt: new Date(),
    hasMeasurement: true,
    cuttingSteps: null,
    transportSteps: {
      levarPerfilEstrutural: false,
      levarPerfilTotal: false,
      levarAcessorios: false,
      levarVidros: false,
      transporteConcluido: false,
    },
    installationSteps: null,
    ...overrides,
  };
}

describe("buildServiceJourneyRow", () => {
  it("mostra todas as fases incluindo Instalação e Concluídos", () => {
    const row = buildServiceJourneyRow(baseOrder());
    expect(row.phases.map((p) => p.shortTitle)).toEqual([
      "Medição",
      "Corte",
      "Transporte",
      "Instalação",
      "Concluídos",
    ]);
    expect(row.phases.find((p) => p.phaseId === "instalacao")?.state).toBe(
      "pending",
    );
    expect(row.phases.find((p) => p.phaseId === "concluidos")?.state).toBe(
      "pending",
    );
  });

  it("marca etapas anteriores como concluídas para OS em transporte", () => {
    const row = buildServiceJourneyRow(baseOrder());
    expect(row.phases.map((p) => p.phaseId)).toEqual([
      "medicao",
      "plano_corte",
      "transporte",
      "instalacao",
      "concluidos",
    ]);
    expect(row.phases.at(-1)?.state).toBe("pending");
    expect(row.phases.find((p) => p.phaseId === "transporte")?.state).toBe(
      "current",
    );
    expect(row.phases.at(0)?.state).toBe("completed");
  });

  it("mostra Instalação em andamento quando há entrega paralela no transporte", () => {
    const row = buildServiceJourneyRow(
      baseOrder({
        transportSteps: {
          levarPerfilEstrutural: true,
          levarPerfilTotal: false,
          levarAcessorios: false,
          levarVidros: false,
          transporteConcluido: false,
        },
        installationSteps: {
          instalacaoEstruturalFeita: false,
          instalacaoVidrosFeita: false,
          instalacaoAcabamentoFeito: false,
          todosVaosConcluidos: false,
        },
      }),
    );
    expect(row.phases.find((p) => p.phaseId === "instalacao")?.state).toBe(
      "current",
    );
  });

  it("mostra Concluídos como etapa atual para OS concluída", () => {
    const row = buildServiceJourneyRow(
      baseOrder({
        status: "concluido",
        transportSteps: null,
        installationSteps: {
          instalacaoEstruturalFeita: true,
          instalacaoVidrosFeita: true,
          instalacaoAcabamentoFeito: true,
          todosVaosConcluidos: true,
        },
      }),
    );
    expect(row.phases.find((p) => p.phaseId === "concluidos")?.state).toBe(
      "current",
    );
    expect(row.phases.filter((p) => p.state === "completed")).toHaveLength(4);
  });
});

describe("filterServiceJourneyRows", () => {
  it("filtra por etapa atual", () => {
    const rows = [
      buildServiceJourneyRow(baseOrder()),
      buildServiceJourneyRow(
        baseOrder({ id: "other", status: "medicao_final" }),
      ),
    ];

    const filtered = filterServiceJourneyRows(rows, {
      ...DEFAULT_SERVICE_REPORT_FILTERS,
      stage: "transporte",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.activePhaseIds).toContain("transporte");
  });

  it("filtra por instalacao usando fases ativas do kanban", () => {
    const rows = [
      buildServiceJourneyRow(
        baseOrder({ id: "inst", status: "instalacao_estrutural" }),
      ),
      buildServiceJourneyRow(baseOrder()),
    ];

    const filtered = filterServiceJourneyRows(rows, {
      ...DEFAULT_SERVICE_REPORT_FILTERS,
      stage: "instalacao",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("inst");
  });

  it("filtra por concluidos", () => {
    const rows = [
      buildServiceJourneyRow(
        baseOrder({
          id: "done",
          status: "concluido",
          transportSteps: null,
          installationSteps: {
            instalacaoEstruturalFeita: true,
            instalacaoVidrosFeita: true,
            instalacaoAcabamentoFeito: true,
            todosVaosConcluidos: true,
          },
        }),
      ),
      buildServiceJourneyRow(baseOrder()),
    ];

    const filtered = filterServiceJourneyRows(rows, {
      ...DEFAULT_SERVICE_REPORT_FILTERS,
      stage: "concluidos",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("done");
  });
});
