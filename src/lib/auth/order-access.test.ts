import { describe, expect, it } from "vitest";
import { canAccessOrder } from "./order-access";
import type { SessionUser } from "./session-types";

const marcos: SessionUser = {
  userId: "motorista-marcos",
  email: "marcos@example.com",
  name: "Marcos",
  roles: ["motorista"],
};

const admin: SessionUser = {
  userId: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  roles: ["admin"],
};

const nelson: SessionUser = {
  userId: "nelson-1",
  email: "nelson@example.com",
  name: "Nelson",
  roles: ["motorista", "instalador"],
};

describe("canAccessOrder — motorista + instalador", () => {
  it("permite transporte quando designado como instalador por vão", () => {
    expect(
      canAccessOrder(nelson, {
        assignedUserId: null,
        status: "transporte_perfil",
        driverIds: [],
        installerIds: ["nelson-1"],
      }),
    ).toBe(true);
  });

  it("permite transporte quando designado como motorista", () => {
    expect(
      canAccessOrder(nelson, {
        assignedUserId: null,
        status: "transporte_perfil",
        driverIds: ["nelson-1"],
        installerIds: [],
      }),
    ).toBe(true);
  });

  it("bloqueia transporte sem designação em nenhum papel", () => {
    expect(
      canAccessOrder(nelson, {
        assignedUserId: null,
        status: "transporte_perfil",
        driverIds: [],
        installerIds: [],
      }),
    ).toBe(false);
  });
});

describe("canAccessOrder — motorista", () => {
  it("permite transporte designado ao motorista logado", () => {
    expect(
      canAccessOrder(marcos, {
        assignedUserId: null,
        status: "transporte_perfil",
        driverIds: ["motorista-marcos"],
      }),
    ).toBe(true);
  });

  it("bloqueia transporte sem motorista designado", () => {
    expect(
      canAccessOrder(marcos, {
        assignedUserId: null,
        status: "transporte_perfil",
        driverIds: [],
      }),
    ).toBe(false);
  });

  it("bloqueia transporte designado a outro motorista", () => {
    expect(
      canAccessOrder(marcos, {
        assignedUserId: "motorista-marcos",
        status: "transporte_levar_vidro",
        driverIds: ["outro-motorista"],
      }),
    ).toBe(false);
  });

  it("não usa pool de OS sem responsável para transporte", () => {
    expect(
      canAccessOrder(marcos, {
        assignedUserId: null,
        status: "transporte_acessorios",
        driverIds: undefined,
      }),
    ).toBe(false);
  });

  it("admin continua vendo qualquer transporte", () => {
    expect(
      canAccessOrder(admin, {
        assignedUserId: null,
        status: "transporte_perfil",
        driverIds: [],
      }),
    ).toBe(true);
  });
});

const pedro: SessionUser = {
  userId: "instalador-pedro",
  email: "pedro@example.com",
  name: "Pedro",
  roles: ["instalador"],
};

describe("canAccessOrder — instalador", () => {
  it("permite transporte designado ao instalador logado", () => {
    expect(
      canAccessOrder(pedro, {
        assignedUserId: null,
        status: "transporte_perfil",
        installerIds: ["instalador-pedro"],
      }),
    ).toBe(true);
  });

  it("bloqueia transporte sem instalador designado", () => {
    expect(
      canAccessOrder(pedro, {
        assignedUserId: null,
        status: "transporte_levar_vidro",
        installerIds: [],
      }),
    ).toBe(false);
  });

  it("bloqueia instalação só com assignedUserId (sem vão designado)", () => {
    expect(
      canAccessOrder(pedro, {
        assignedUserId: "instalador-pedro",
        status: "instalacao_estrutural",
        installerIds: [],
      }),
    ).toBe(false);
  });

  it("permite instalação designada ao instalador logado", () => {
    expect(
      canAccessOrder(pedro, {
        assignedUserId: null,
        status: "instalacao_estrutural",
        installerIds: ["instalador-pedro"],
      }),
    ).toBe(true);
  });

  it("bloqueia instalação sem instalador designado", () => {
    expect(
      canAccessOrder(pedro, {
        assignedUserId: null,
        status: "instalacao_vidros",
        installerIds: [],
      }),
    ).toBe(false);
  });

  it("bloqueia instalação designada a outro instalador", () => {
    expect(
      canAccessOrder(pedro, {
        assignedUserId: "instalador-pedro",
        status: "instalacao_estrutural",
        installerIds: ["outro-instalador"],
      }),
    ).toBe(false);
  });

  it("admin continua vendo qualquer instalação", () => {
    expect(
      canAccessOrder(admin, {
        assignedUserId: null,
        status: "instalacao_estrutural",
        installerIds: [],
      }),
    ).toBe(true);
  });
});
