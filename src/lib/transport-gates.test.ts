import { describe, it, expect } from "vitest";
import {
  isCuttingPhaseStatus,
  isTransportPhaseStatus,
  isInstallationPhaseStatus,
  canOperateTransportModule,
  canOperateInstallationModule,
  canOperateCuttingModule,
  isTransportFullyDone,
  hasPendingCuttingSteps,
  type CuttingSteps,
  type TransportSteps,
} from "./transport-gates";

const cuttingDone: CuttingSteps = {
  corteFeito: true,
  embalagemFeita: true,
  acessoriosFeitos: true,
  vidrosFeitos: true,
};

const cuttingNone: CuttingSteps = {
  corteFeito: false,
  embalagemFeita: false,
  acessoriosFeitos: false,
  vidrosFeitos: false,
};

describe("classificação de fase", () => {
  it("identifica fase de corte", () => {
    expect(isCuttingPhaseStatus("cortes")).toBe(true);
    expect(isCuttingPhaseStatus("embalagem")).toBe(true);
    expect(isCuttingPhaseStatus("transporte_perfil")).toBe(false);
  });

  it("identifica fase de transporte pelo array canônico", () => {
    expect(isTransportPhaseStatus("transporte_perfil")).toBe(true);
    expect(isTransportPhaseStatus("transporte_levar_vidro")).toBe(true);
    expect(isTransportPhaseStatus("instalacao_estrutural")).toBe(false);
    expect(isTransportPhaseStatus("concluido")).toBe(false);
  });

  it("identifica fase de instalação incluindo concluído", () => {
    expect(isInstallationPhaseStatus("instalacao_estrutural")).toBe(true);
    expect(isInstallationPhaseStatus("concluido")).toBe(true);
    expect(isInstallationPhaseStatus("transporte_perfil")).toBe(false);
  });
});

describe("canOperateCuttingModule", () => {
  it("opera durante a fase de corte", () => {
    expect(canOperateCuttingModule("cortes", cuttingNone)).toBe(true);
  });

  it("continua operando em transporte se há etapas de corte pendentes", () => {
    expect(canOperateCuttingModule("transporte_perfil", cuttingNone)).toBe(true);
  });

  it("não opera em transporte se o corte está completo", () => {
    expect(canOperateCuttingModule("transporte_perfil", cuttingDone)).toBe(false);
  });
});

describe("canOperateTransportModule", () => {
  it("libera transporte após corte feito durante a fase de corte", () => {
    expect(canOperateTransportModule("cortes", { ...cuttingNone, corteFeito: true })).toBe(true);
    expect(canOperateTransportModule("cortes", cuttingNone)).toBe(false);
  });

  it("sempre opera nas fases de transporte e instalação", () => {
    expect(canOperateTransportModule("transporte_perfil", cuttingNone)).toBe(true);
    expect(canOperateTransportModule("instalacao_vidros", cuttingNone)).toBe(true);
  });
});

describe("canOperateInstallationModule", () => {
  it("requer corte feito durante corte/transporte", () => {
    expect(canOperateInstallationModule("transporte_perfil", cuttingNone)).toBe(false);
    expect(canOperateInstallationModule("transporte_perfil", { ...cuttingNone, corteFeito: true })).toBe(true);
  });

  it("sempre opera na fase de instalação", () => {
    expect(canOperateInstallationModule("instalacao_estrutural", cuttingNone)).toBe(true);
  });
});

describe("isTransportFullyDone / hasPendingCuttingSteps", () => {
  it("isTransportFullyDone exige as 4 entregas + flag de conclusão", () => {
    const partial: TransportSteps = {
      levarPerfilEstrutural: true,
      levarPerfilTotal: true,
      levarAcessorios: true,
      levarVidros: true,
      transporteConcluido: false,
    };
    expect(isTransportFullyDone(partial)).toBe(false);
    expect(isTransportFullyDone({ ...partial, transporteConcluido: true })).toBe(true);
  });

  it("hasPendingCuttingSteps detecta qualquer etapa pendente", () => {
    expect(hasPendingCuttingSteps(cuttingDone)).toBe(false);
    expect(hasPendingCuttingSteps({ ...cuttingDone, vidrosFeitos: false })).toBe(true);
  });
});
