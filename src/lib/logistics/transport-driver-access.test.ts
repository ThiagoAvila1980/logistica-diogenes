import { describe, expect, it } from "vitest";
import {
  canAccessVaoAsSession,
  canOperateVaoStepAsSession,
  collectDriverIdsFromMeasurementItems,
  filterVaoItemsForSession,
  hasPendingTransportWorkForDriver,
  mergeDriverIds,
} from "./transport-driver-access";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { SessionUser } from "@/lib/auth/session-types";

function makeSession(roles: SessionUser["roles"], userId = "user-1"): SessionUser {
  return { userId, name: "Teste", email: "teste@example.com", roles };
}

describe("transport-driver-access", () => {
  it("coleta motoristas únicos dos vãos", () => {
    const items = [
      {
        id: "a",
        qty: 1,
        largura: 1,
        altura: 1,
        transportProgress: { driverId: "m1" },
      },
      {
        id: "b",
        qty: 1,
        largura: 1,
        altura: 1,
        transportProgress: { driverId: "m2" },
      },
      {
        id: "c",
        qty: 1,
        largura: 1,
        altura: 1,
        transportProgress: { driverId: "m1" },
      },
    ] as MeasurementLineItem[];

    expect(collectDriverIdsFromMeasurementItems(items)).toEqual(["m1", "m2"]);
  });

  it("coleta motoristas designados por item (stepAssignments), não só o legado do vão", () => {
    const items = [
      {
        id: "a",
        qty: 1,
        largura: 1,
        altura: 1,
        transportProgress: {
          perfilEstrutural: false,
          perfilTotal: false,
          acessorios: false,
          vidros: false,
          stepAssignments: {
            perfilEstrutural: { driverId: "m1", scheduledDate: null },
            vidros: { driverId: "m3", scheduledDate: null },
          },
        },
      },
    ] as MeasurementLineItem[];

    expect(collectDriverIdsFromMeasurementItems(items)).toEqual(["m1", "m3"]);
  });

  it("mescla motoristas do log legado com os vãos", () => {
    expect(mergeDriverIds(["m1"], ["m2"], [null, "m1"])).toEqual(["m1", "m2"]);
  });

  describe("canAccessVaoAsSession", () => {
    const item = {
      transportProgress: {
        perfilEstrutural: false,
        perfilTotal: false,
        acessorios: false,
        vidros: false,
        stepAssignments: {
          perfilEstrutural: { driverId: "motorista-a", scheduledDate: null },
        },
      },
    } as Pick<MeasurementLineItem, "transportProgress">;

    it("admin/gerente acessam qualquer vão", () => {
      expect(canAccessVaoAsSession(makeSession(["admin"]), item)).toBe(true);
      expect(canAccessVaoAsSession(makeSession(["gerente"]), item)).toBe(true);
    });

    it("motorista designado em ao menos 1 item acessa o vão", () => {
      expect(
        canAccessVaoAsSession(makeSession(["motorista"], "motorista-a"), item),
      ).toBe(true);
    });

    it("motorista não designado em nenhum item não acessa o vão", () => {
      expect(
        canAccessVaoAsSession(makeSession(["motorista"], "motorista-b"), item),
      ).toBe(false);
    });
  });

  describe("canOperateVaoStepAsSession", () => {
    const item = {
      transportProgress: {
        perfilEstrutural: false,
        perfilTotal: false,
        acessorios: false,
        vidros: false,
        stepAssignments: {
          perfilEstrutural: { driverId: "motorista-a", scheduledDate: null },
          vidros: { driverId: "motorista-b", scheduledDate: null },
        },
      },
    } as Pick<MeasurementLineItem, "transportProgress">;

    it("motorista só pode operar o item em que está designado", () => {
      const sessionA = makeSession(["motorista"], "motorista-a");
      expect(canOperateVaoStepAsSession(sessionA, item, "perfilEstrutural")).toBe(true);
      expect(canOperateVaoStepAsSession(sessionA, item, "vidros")).toBe(false);
    });

    it("admin/gerente podem operar qualquer item", () => {
      const admin = makeSession(["admin"]);
      expect(canOperateVaoStepAsSession(admin, item, "vidros")).toBe(true);
    });
  });

  describe("filterVaoItemsForSession", () => {
    it("motorista só vê vãos em que está designado em ao menos 1 item", () => {
      const items = [
        {
          id: "a",
          transportProgress: {
            perfilEstrutural: false,
            perfilTotal: false,
            acessorios: false,
            vidros: false,
            stepAssignments: {
              vidros: { driverId: "motorista-a", scheduledDate: null },
            },
          },
        },
        {
          id: "b",
          transportProgress: {
            perfilEstrutural: false,
            perfilTotal: false,
            acessorios: false,
            vidros: false,
            stepAssignments: {
              vidros: { driverId: "motorista-b", scheduledDate: null },
            },
          },
        },
      ] as Array<{ id: string; transportProgress?: MeasurementLineItem["transportProgress"] }>;

      const result = filterVaoItemsForSession(
        items,
        makeSession(["motorista"], "motorista-a"),
      );
      expect(result.map((i) => i.id)).toEqual(["a"]);
    });
  });

  describe("hasPendingTransportWorkForDriver", () => {
    const full = {
      perfilEstrutural: true,
      perfilTotal: true,
      acessorios: true,
      vidros: true,
    };

    it("retorna false quando o motorista concluiu todas as etapas designadas a ele", () => {
      const items = [
        {
          id: "a",
          qty: 1,
          largura: 1,
          altura: 1,
          transportProgress: { ...full, driverId: "motorista-a" },
        },
        {
          id: "b",
          qty: 1,
          largura: 1,
          altura: 1,
          // Outro motorista ainda pendente — não deve manter a OS na lista do motorista-a
          transportProgress: {
            perfilEstrutural: false,
            perfilTotal: false,
            acessorios: false,
            vidros: false,
            driverId: "motorista-b",
          },
        },
      ] as MeasurementLineItem[];

      expect(hasPendingTransportWorkForDriver(items, "motorista-a")).toBe(false);
      expect(hasPendingTransportWorkForDriver(items, "motorista-b")).toBe(true);
    });

    it("retorna true se ainda há etapa designada ao motorista incompleta", () => {
      const items = [
        {
          id: "a",
          qty: 1,
          largura: 1,
          altura: 1,
          transportProgress: {
            perfilEstrutural: true,
            perfilTotal: true,
            acessorios: true,
            vidros: false,
            driverId: "motorista-a",
          },
        },
      ] as MeasurementLineItem[];

      expect(hasPendingTransportWorkForDriver(items, "motorista-a")).toBe(true);
    });
  });
});
