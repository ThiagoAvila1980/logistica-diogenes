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

  it("exclui instalação para motorista e inclui concluído para reavaliar entrega pendente", () => {
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
    ).toBe(true);
  });

  it("inclui instalação em andamento e concluído para admin reavaliar vãos pendentes", () => {
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

  it("mantém instalação enquanto ainda há entrega pendente", () => {
    expect(
      isActiveTransportListing(
        makeOrder({ status: "instalacao_estrutural" }),
        {
          ...completedTransport,
          transporteConcluido: false,
          levarVidros: false,
        },
      ),
    ).toBe(true);
  });

  it("remove instalação quando todos os vãos já concluíram o transporte", () => {
    expect(
      isActiveTransportListing(
        makeOrder({ status: "instalacao_estrutural" }),
        completedTransport,
      ),
    ).toBe(false);
  });

  it("mantém OS concluída quando ainda há trabalho de transporte", () => {
    expect(
      isActiveTransportListing(
        makeOrder({ status: "concluido" }),
        {
          ...completedTransport,
          transporteConcluido: false,
          levarVidros: false,
        },
        { hasPendingTransportWork: true },
      ),
    ).toBe(true);
  });

  it("remove OS concluída quando não há trabalho de transporte", () => {
    expect(
      isActiveTransportListing(
        makeOrder({ status: "concluido" }),
        completedTransport,
        { hasPendingTransportWork: false },
      ),
    ).toBe(false);
  });
});
