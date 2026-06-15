import { describe, expect, it } from "vitest";
import type { OrderListItem } from "@/lib/data/types";
import type { InstallationSteps } from "@/lib/transport-gates";
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

const completedInstallation: InstallationSteps = {
  instalacaoEstruturalFeita: true,
  instalacaoVidrosFeita: true,
  instalacaoAcabamentoFeito: true,
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

  it("inclui transporte em paralelo apenas para admin/gerente", () => {
    expect(
      isInstallationIndexCandidate(
        makeOrder({ status: "transporte_levar_vidro" }),
        ["instalador"],
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
      }),
    ).toBe(true);
  });

  it("remove instalação concluída da listagem", () => {
    expect(
      isActiveInstallationListing(makeOrder(), completedInstallation),
    ).toBe(false);
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
