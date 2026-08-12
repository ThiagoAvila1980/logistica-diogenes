import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderCardAddVaosAction } from "@/components/order/order-card-add-vaos-action";
import type { OrderListItem } from "@/lib/data/types";
import { ProductionOrderCard } from "./production-order-card";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const order: OrderListItem = {
  id: "os-123",
  number: "OS-123",
  status: "cortes",
  type: "final",
  measurementStatus: "completed",
  priority: "normal",
  clientName: "Cliente Teste",
  assignedUserId: null,
  scheduledDate: null,
  updatedAt: new Date("2026-08-12T12:00:00Z"),
  budgetReference: null,
  hasMeasurement: true,
  pedidoStatus: "em_aberto",
  archivedAt: null,
};

describe("ProductionOrderCard", () => {
  it("renderiza ações fora dos links de navegação do card", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductionOrderCard, {
        order,
        steps: {
          corteFeito: false,
          embalagemFeita: false,
          acessoriosFeitos: false,
          vidrosFeitos: false,
        },
        actions: React.createElement(
          "button",
          { type: "button", "aria-label": "Ação do card" },
          "Ação",
        ),
      }),
    );

    expect(markup).toContain('aria-label="Ação do card"');
    expect(markup.match(/<a /g)).toHaveLength(2);

    const firstLinkEnd = markup.indexOf("</a>");
    const actionStart = markup.indexOf("<button");
    const actionEnd = markup.indexOf("</button>");
    const secondLinkStart = markup.indexOf("<a ", firstLinkEnd + 4);

    expect(firstLinkEnd).toBeLessThan(actionStart);
    expect(actionEnd).toBeLessThan(secondLinkStart);
  });
});

describe("OrderCardAddVaosAction", () => {
  it("navega para a medição no modo de adicionar vãos", () => {
    const markup = renderToStaticMarkup(
      React.createElement(OrderCardAddVaosAction, { osId: "os-123" }),
    );

    expect(markup).toContain('href="/field/os-123?addVaos=1"');
    expect(markup).toContain('aria-label="Adicionar vãos"');
  });
});
