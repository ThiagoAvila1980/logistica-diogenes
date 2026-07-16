import { describe, it, expect } from "vitest";
import { AUDIT_ACTIONS } from "./actions";
import {
  AUDIT_ACTION_LABELS,
  getAuditActionLabel,
  formatAuditPayloadSummary,
} from "./action-labels";

describe("AUDIT_ACTION_LABELS", () => {
  it("tem label para cada AUDIT_ACTIONS", () => {
    for (const action of Object.values(AUDIT_ACTIONS)) {
      expect(AUDIT_ACTION_LABELS[action], action).toBeTruthy();
      expect(typeof AUDIT_ACTION_LABELS[action]).toBe("string");
    }
  });

  it("getAuditActionLabel retorna label conhecido e fallback bruto", () => {
    expect(getAuditActionLabel(AUDIT_ACTIONS.CUTTING_STEP_CHECKED)).toMatch(
      /corte/i,
    );
    expect(getAuditActionLabel("unknown.action")).toBe("unknown.action");
  });
});

describe("formatAuditPayloadSummary", () => {
  it("retorna string vazia para payload ausente ou vazio", () => {
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.OS_STAGE_CHANGED, null),
    ).toBe("");
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.OS_STAGE_CHANGED, undefined),
    ).toBe("");
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.ADMIN_USER_CREATED, {}),
    ).toBe("");
  });

  it("resume etapa de corte/transporte/instalação", () => {
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.CUTTING_STEP_CHECKED, {
        step: "corte",
        done: true,
      }),
    ).toMatch(/corte/i);
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.TRANSPORT_DRIVER_ASSIGNED, {
        step: "vidros",
        driverId: "d1",
      }),
    ).toMatch(/vidros/i);
  });

  it("resume transição de etapa da OS", () => {
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.OS_STAGE_CHANGED, {
        fromStatus: "cortes",
        toStatus: "transporte_perfil",
      }),
    ).toMatch(/cortes.*transporte/i);
  });

  it("resume campos alterados no admin", () => {
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.ADMIN_USER_UPDATED, {
        fields: ["roles", "active"],
      }),
    ).toMatch(/roles/i);
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.ADMIN_USER_UPDATED, {
        fields: ["roles", "active"],
      }),
    ).toMatch(/active/i);
  });

  it("resume lookup e contadores", () => {
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.ADMIN_LOOKUP_CREATED, {
        lookup: "tipo_envidracamento",
      }),
    ).toMatch(/tipo_envidracamento|envidracamento/i);
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.ADMIN_ROLE_ACCESS_UPDATED, {
        cellCount: 12,
      }),
    ).toMatch(/12/);
    expect(
      formatAuditPayloadSummary(AUDIT_ACTIONS.FIELD_MEASUREMENT_SAVED, {
        itemsCount: 3,
        photosCount: 2,
      }),
    ).toMatch(/3/);
  });
});
