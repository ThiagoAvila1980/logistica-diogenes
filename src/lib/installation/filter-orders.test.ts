import { describe, expect, it } from "vitest";
import type { OrderListItem } from "@/lib/data/types";
import type { InstallationOrderProgress } from "@/lib/data/installation-steps-batch";
import {
  isActiveInstallationListing,
  isInstallationIndexCandidate,
} from "./filter-orders";

function makeOrder(
  overrides: Partial<OrderListItem> = {},
): OrderListItem {
  return {
    id: "os-1",
    number: "001",
    status: "instalacao_estrutural",
    type: "final",
    measurementStatus: "medida",
    priority: "normal",
    clientName: "Cliente",
    assignedUserId: null,
    scheduledDate: null,
    updatedAt: new Date(),
    budgetReference: null,
    hasMeasurement: true,
    ...overrides,
  };
}

const completedInstallation: InstallationOrderProgress = {
  instalacaoEstruturalFeita: true,
  instalacaoVidrosFeita: true,
  instalacaoAcabamentoFeito: true,
  todosVaosConcluidos: true,
};

const stepsDoneButNotConfirmed: InstallationOrderProgress = {
  instalacaoEstruturalFeita: true,
  instalacaoVidrosFeita: true,
  instalacaoAcabamentoFeito: true,
  todosVaosConcluidos: false,
};

describe("isInstallationIndexCandidate", () => {
  it("inclui etapas de instalação para instalador", () => {
    expect(
      isInstallationIndexCandidate(
        makeOrder({ status: "instalacao_vidros" }),
        ["instalador"],
      ),
    ).toBe(true);
  });

  it("exclui concluído para todos os papéis", () => {
    expect(
      isInstallationIndexCandidate(makeOrder({ status: "concluido" }), [
        "instalador",
      ]),
    ).toBe(false);
    expect(
      isInstallationIndexCandidate(makeOrder({ status: "concluido" }), [
        "admin",
      ]),
    ).toBe(false);
  });

  it("inclui transporte em paralelo para instalador", () => {
    expect(
      isInstallationIndexCandidate(
        makeOrder({ status: "transporte_levar_vidro" }),
        ["instalador"],
      ),
    ).toBe(true);
  });

  it("inclui transporte em paralelo apenas para admin/gerente", () => {
    expect(
      isInstallationIndexCandidate(
        makeOrder({ status: "transporte_levar_vidro" }),
        ["medidor"],
      ),
    ).toBe(false);
    expect(
      isInstallationIndexCandidate(
        makeOrder({ status: "transporte_levar_vidro" }),
        ["admin"],
      ),
    ).toBe(true);
  });
});

describe("isActiveInstallationListing", () => {
  it("mantém instalação com etapas pendentes", () => {
    expect(
      isActiveInstallationListing(makeOrder(), {
        ...completedInstallation,
        instalacaoAcabamentoFeito: false,
        todosVaosConcluidos: false,
      }),
    ).toBe(true);
  });

  it("mantém instalação quando todas as fases estão ticadas mas vãos não foram confirmados", () => {
    expect(
      isActiveInstallationListing(makeOrder(), stepsDoneButNotConfirmed),
    ).toBe(true);
  });

  it("remove instalação quando todos os vãos foram confirmados como concluídos", () => {
    expect(
      isActiveInstallationListing(makeOrder(), completedInstallation),
    ).toBe(false);
  });

  it("para instalador, remove OS quando não há trabalho pendente dele", () => {
    expect(
      isActiveInstallationListing(makeOrder(), stepsDoneButNotConfirmed, {
        hasOperatorPendingWork: false,
      }),
    ).toBe(false);
  });

  it("para instalador, mantém OS quando ainda há trabalho pendente dele", () => {
    expect(
      isActiveInstallationListing(makeOrder(), completedInstallation, {
        hasOperatorPendingWork: true,
      }),
    ).toBe(true);
  });

  it("remove OS com status concluído", () => {
    expect(
      isActiveInstallationListing(
        makeOrder({ status: "concluido" }),
        completedInstallation,
      ),
    ).toBe(false);
  });
});
