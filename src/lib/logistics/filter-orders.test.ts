import { describe, expect, it } from "vitest";
import type { OrderListItem } from "@/lib/data/types";
import type { TransportSteps } from "@/lib/transport-gates";
import {
  isActiveTransportListing,
  isLogisticsIndexCandidate,
} from "./filter-orders";

function makeOrder(
  overrides: Partial<OrderListItem> = {},
): OrderListItem {
  return {
    id: "os-1",
    number: "001",
    status: "transporte_perfil",
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

const completedTransport: TransportSteps = {
  levarPerfilEstrutural: true,
  levarPerfilTotal: true,
  levarAcessorios: true,
  levarVidros: true,
  transporteConcluido: true,
};

describe("isLogisticsIndexCandidate", () => {
  it("inclui etapas de transporte para motorista", () => {
    expect(
      isLogisticsIndexCandidate(
        makeOrder({ status: "transporte_levar_vidro" }),
        ["motorista"],
      ),
    ).toBe(true);
  });

  it("exclui instalação e concluído para motorista", () => {
    expect(
      isLogisticsIndexCandidate(
        makeOrder({ status: "instalacao_estrutural" }),
        ["motorista"],
      ),
    ).toBe(false);
    expect(
      isLogisticsIndexCandidate(makeOrder({ status: "concluido" }), [
        "motorista",
      ]),
    ).toBe(false);
  });

  it("inclui instalação e concluído para admin", () => {
    expect(
      isLogisticsIndexCandidate(
        makeOrder({ status: "instalacao_vidros" }),
        ["admin"],
      ),
    ).toBe(true);
    expect(
      isLogisticsIndexCandidate(makeOrder({ status: "concluido" }), ["admin"]),
    ).toBe(true);
  });
});

describe("isActiveTransportListing", () => {
  it("mantém transporte com entregas pendentes", () => {
    expect(
      isActiveTransportListing(makeOrder(), {
        ...completedTransport,
        transporteConcluido: false,
        levarVidros: false,
      }),
    ).toBe(true);
  });

  it("remove transporte concluído da listagem", () => {
    expect(
      isActiveTransportListing(
        makeOrder({ status: "transporte_levar_vidro" }),
        completedTransport,
      ),
    ).toBe(false);
  });

  it("para motorista, remove OS quando não há trabalho pendente dele", () => {
    expect(
      isActiveTransportListing(
        makeOrder({ status: "transporte_levar_vidro" }),
        {
          ...completedTransport,
          transporteConcluido: false,
          levarVidros: false,
        },
        { hasOperatorPendingWork: false },
      ),
    ).toBe(false);
  });

  it("para motorista, mantém OS quando ainda há trabalho pendente dele", () => {
    expect(
      isActiveTransportListing(
        makeOrder(),
        completedTransport,
        { hasOperatorPendingWork: true },
      ),
    ).toBe(true);
  });

  it("mantém instalação e concluído sem checar transporte", () => {
    expect(
      isActiveTransportListing(
        makeOrder({ status: "instalacao_estrutural" }),
        completedTransport,
      ),
    ).toBe(true);
    expect(
      isActiveTransportListing(
        makeOrder({ status: "concluido" }),
        completedTransport,
      ),
    ).toBe(true);
  });
});
