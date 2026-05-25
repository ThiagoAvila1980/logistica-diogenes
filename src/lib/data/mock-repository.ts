import type {
  MeasurementDbStatus,
  MeasurementDbType,
  MeasurementPriority,
  OsStatus,
} from "@/db/schema";
import type { OrderDetail, OrderListItem } from "./types";
import {
  assertTransitionGuards,
  canTransition,
  TransitionValidationError,
} from "@/lib/workflow/status-machine";
import type { TransitionResult } from "@/actions/service-order";
import type { AdvanceOSResult } from "@/actions/os-actions";
import {
  isAllowedAdvance,
  type AdvanceTargetStatus,
} from "@/lib/workflow/advance-flow";
import { getAllowedTransitions } from "@/lib/workflow/measurement-flow";
import {
  validateAdvancePayload,
  type AdvanceStepContext,
} from "@/lib/workflow/validate-advance-payload";
import {
  getMeasurementActionErrorMessage,
  isMeasurementActionAllowed,
  osStatusFromMeasurementType,
} from "@/lib/workflow/measurement-actions";
import { vehicleMockStore } from "@/lib/data/admin-mock-store";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

type MockMeasurement = {
  id: string;
  number: string;
  type: MeasurementDbType;
  status: MeasurementDbStatus;
  etapa: OsStatus;
  priority: MeasurementPriority;
  assignedUserId: string | null;
  cliente: string | null;
  telefone: string | null;
  numeroOrcamento: string | null;
  budgetReference: string | null;
  sourcePdfUrl: string | null;
  description: string | null;
  scheduledDate: Date | null;
  revisionReason: string | null;
  revisionFromEtapa: OsStatus | null;
  dimensions?: Record<string, number>;
  items?: MeasurementLineItem[];
  notes?: string | null;
  photos?: string[];
  updatedAt: Date;
};

type MockCutting = {
  idMedicao: string;
  corteFeito: boolean;
  embalagemFeita: boolean;
  acessoriosFeitos: boolean;
  operatorId?: string | null;
  notes?: string | null;
};

type MockTransport = {
  idMedicao: string;
  itemsChecked?: Record<string, boolean> | null;
  vehicleId?: string | null;
};

type MockInstallation = {
  idMedicao: string;
  photos: { before?: string[]; after?: string[] } | null;
  notes?: string | null;
  structuralInstalled?: boolean;
  glassInstalled?: boolean;
  finalCompleted?: boolean;
};

const DEMO_MEDIDOR = "a1000000-0000-4000-8000-000000000002";
const DEMO_CORTADOR = "a1000000-0000-4000-8000-000000000003";
const DEMO_MOTORISTA = "a1000000-0000-4000-8000-000000000004";
const DEMO_INSTALADOR = "a1000000-0000-4000-8000-000000000005";

function isMeasured(m: MockMeasurement): boolean {
  return m.status === "medida" || !!(m.items && m.items.length > 0);
}

function resolvedBudgetReference(m: MockMeasurement): string | null {
  return m.budgetReference?.trim() || m.numeroOrcamento?.trim() || null;
}

function toListItem(m: MockMeasurement): OrderListItem {
  return {
    id: m.id,
    number: m.number,
    status: m.etapa,
    type: m.type,
    measurementStatus: m.status,
    priority: m.priority,
    clientName: m.cliente?.trim() || "Cliente não informado",
    assignedUserId: m.assignedUserId,
    scheduledDate: m.scheduledDate,
    updatedAt: m.updatedAt,
    budgetReference: resolvedBudgetReference(m),
    hasMeasurement: isMeasured(m),
  };
}

function toOrderDetail(m: MockMeasurement): OrderDetail {
  return {
    ...toListItem(m),
    description: m.description,
    revisionReason: m.revisionReason,
    revisionFromStatus: m.revisionFromEtapa,
    clientPhone: m.telefone,
    sourcePdfUrl: m.sourcePdfUrl,
  };
}

let measurements: MockMeasurement[] = [
  {
    id: "a1111111-1111-4111-8111-111111111101",
    number: "OS-2026-00001",
    type: "final",
    status: "pendente",
    etapa: "medicao_final",
    priority: "normal",
    assignedUserId: DEMO_MEDIDOR,
    cliente: "Residencial Solar",
    telefone: "(11) 98765-4321",
    numeroOrcamento: "ORC-2026-0001",
    budgetReference: "ORC-2026-0001",
    sourcePdfUrl: null,
    description: "Sacada envidraçada — 4 folhas",
    scheduledDate: new Date("2026-05-20"),
    revisionReason: null,
    revisionFromEtapa: null,
    photos: [],
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111102",
    number: "OS-2026-00002",
    type: "orcamento",
    status: "pendente",
    etapa: "medicao_orcamento",
    priority: "alta",
    assignedUserId: null,
    cliente: "Comercial Vidro & Cia",
    telefone: "(11) 91234-5678",
    numeroOrcamento: null,
    budgetReference: null,
    sourcePdfUrl: null,
    description: "Fachada comercial — perfil structurado",
    scheduledDate: new Date("2026-05-22"),
    revisionReason: null,
    revisionFromEtapa: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111103",
    number: "OS-2026-00003",
    type: "final",
    status: "medida",
    etapa: "cortes",
    priority: "urgente",
    assignedUserId: DEMO_CORTADOR,
    cliente: "Condomínio Horizonte",
    telefone: "(11) 99876-5432",
    numeroOrcamento: "ORC-2026-0003",
    budgetReference: null,
    sourcePdfUrl: null,
    description: "Box blindex banheiro social",
    scheduledDate: new Date("2026-05-18"),
    revisionReason: null,
    revisionFromEtapa: null,
    dimensions: { largura: 900, altura: 2100 },
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111104",
    number: "OS-2026-00004",
    type: "final",
    status: "medida",
    etapa: "embalagem",
    priority: "normal",
    assignedUserId: DEMO_CORTADOR,
    cliente: "Residencial Solar",
    telefone: "(11) 98765-4321",
    numeroOrcamento: "ORC-2026-0004",
    budgetReference: null,
    sourcePdfUrl: null,
    description: "Janelas quartos — 6 unidades",
    scheduledDate: new Date("2026-05-25"),
    revisionReason: null,
    revisionFromEtapa: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111105",
    number: "OS-2026-00005",
    type: "final",
    status: "pendente",
    etapa: "medicao_final",
    priority: "normal",
    assignedUserId: null,
    cliente: "Comercial Vidro & Cia",
    telefone: "(11) 91234-5678",
    numeroOrcamento: null,
    budgetReference: null,
    sourcePdfUrl: null,
    description: "Guarda-corpo varanda — medição final pós-aprovação",
    scheduledDate: new Date("2026-05-21"),
    revisionReason: null,
    revisionFromEtapa: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111106",
    number: "OS-2026-00006",
    type: "final",
    status: "medida",
    etapa: "transporte_perfil",
    priority: "alta",
    assignedUserId: DEMO_MOTORISTA,
    cliente: "Condomínio Horizonte",
    telefone: "(11) 99876-5432",
    numeroOrcamento: null,
    budgetReference: null,
    sourcePdfUrl: null,
    description: "Entrega esquadrias — bloco B",
    scheduledDate: new Date("2026-05-23"),
    revisionReason: null,
    revisionFromEtapa: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111107",
    number: "OS-2026-00007",
    type: "final",
    status: "medida",
    etapa: "instalacao_estrutural",
    priority: "urgente",
    assignedUserId: DEMO_INSTALADOR,
    cliente: "Residencial Solar",
    telefone: "(11) 98765-4321",
    numeroOrcamento: null,
    budgetReference: null,
    sourcePdfUrl: null,
    description: "Instalação estrutural sacada",
    scheduledDate: new Date("2026-05-24"),
    revisionReason: null,
    revisionFromEtapa: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111108",
    number: "OS-2026-00008",
    type: "final",
    status: "pendente",
    etapa: "medicao_final",
    priority: "normal",
    assignedUserId: DEMO_MEDIDOR,
    cliente: "Condomínio Horizonte",
    telefone: "(11) 99876-5432",
    numeroOrcamento: null,
    budgetReference: null,
    sourcePdfUrl: null,
    description: "Nova medição — cliente solicitou visita técnica",
    scheduledDate: new Date("2026-05-20"),
    revisionReason: null,
    revisionFromEtapa: null,
    updatedAt: new Date(),
  },
];

let cuttingPlans: MockCutting[] = [
  {
    idMedicao: "a1111111-1111-4111-8111-111111111103",
    corteFeito: true,
    embalagemFeita: false,
    acessoriosFeitos: false,
  },
  {
    idMedicao: "a1111111-1111-4111-8111-111111111104",
    corteFeito: true,
    embalagemFeita: true,
    acessoriosFeitos: true,
  },
];

let installationLogs: MockInstallation[] = [
  {
    idMedicao: "a1111111-1111-4111-8111-111111111107",
    photos: null,
    notes: null,
  },
];

let transportStore: MockTransport[] = [
  {
    idMedicao: "a1111111-1111-4111-8111-111111111106",
    vehicleId: "b1000000-0000-4000-8000-000000000001",
  },
];

vehicleMockStore.assignToTransport(
  "a1111111-1111-4111-8111-111111111106",
  "b1000000-0000-4000-8000-000000000001",
);

function findMeasurement(id: string): MockMeasurement | undefined {
  return measurements.find((m) => m.id === id);
}

function buildAdvanceContext(idMedicao: string): AdvanceStepContext {
  const m = findMeasurement(idMedicao);
  const cut = cuttingPlans.find((c) => c.idMedicao === idMedicao);
  const trans = transportStore.find((t) => t.idMedicao === idMedicao);
  const inst = installationLogs.find((i) => i.idMedicao === idMedicao);

  return {
    hasFinalMeasurement: !!m && m.type === "final" && isMeasured(m),
    cuttingPlan: cut
      ? {
          corteFeito: cut.corteFeito,
          embalagemFeita: cut.embalagemFeita,
          acessoriosFeitos: cut.acessoriosFeitos,
        }
      : null,
    transportItemsChecked: trans?.itemsChecked ?? null,
    installation: inst ? { photos: inst.photos } : null,
  };
}

function loadContext(idMedicao: string, m: MockMeasurement) {
  const cut = cuttingPlans.find((c) => c.idMedicao === idMedicao);
  const trans = transportStore.find((t) => t.idMedicao === idMedicao);
  const inst = installationLogs.find((i) => i.idMedicao === idMedicao);
  const photos = inst?.photos;
  const hasBeforeAfter =
    !!photos &&
    (photos.before?.length ?? 0) > 0 &&
    (photos.after?.length ?? 0) > 0;

  return {
    hasFinalMeasurement: m.type === "final" && isMeasured(m),
    hasBudgetMeasurement: m.type === "orcamento" && isMeasured(m),
    cuttingSteps: {
      corteFeito: cut?.corteFeito ?? false,
      embalagemFeita: cut?.embalagemFeita ?? false,
      acessoriosFeitos: cut?.acessoriosFeitos ?? false,
    },
    transportItemsChecked: trans?.itemsChecked ?? null,
    installationHasPhotos: hasBeforeAfter,
    revisionFromStatus:
      m.etapa === "revisao" ? m.revisionFromEtapa : null,
  };
}

export const mockRepository = {
  list(): OrderListItem[] {
    return measurements
      .map(toListItem)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  listKanban() {
    return measurements.map((m) => {
      const cut = cuttingPlans.find((c) => c.idMedicao === m.id);
      const isCortePhase =
        m.etapa === "cortes" ||
        m.etapa === "embalagem" ||
        m.etapa === "acessorios_plano";

      return {
        id: m.id,
        number: m.number,
        budgetReference: resolvedBudgetReference(m),
        status: m.etapa,
        type: m.type,
        measurementStatus: m.status,
        clientName: m.cliente?.trim() || "Cliente não informado",
        priority: m.priority,
        scheduledDate: m.scheduledDate,
        updatedAt: m.updatedAt,
        hasMeasurement: isMeasured(m),
        cuttingSteps: isCortePhase && cut
          ? {
              corte: cut.corteFeito,
              embalagem: cut.embalagemFeita,
              acessorios: cut.acessoriosFeitos,
            }
          : null,
      };
    });
  },

  getCuttingDetail(osId: string) {
    const m = findMeasurement(osId);
    const cut = cuttingPlans.find((c) => c.idMedicao === osId);
    return {
      measurement: m
        ? {
            cliente: m.cliente,
            items: m.items ?? [],
            photos: m.photos ?? [],
            notes: m.notes ?? null,
            dimensions: m.dimensions ?? null,
          }
        : null,
      cuttingSteps: {
        corte: cut?.corteFeito ?? false,
        embalagem: cut?.embalagemFeita ?? false,
        acessorios: cut?.acessoriosFeitos ?? false,
      },
    };
  },

  updateCuttingStep(
    osId: string,
    step: "corte" | "embalagem" | "acessorios",
    done: boolean,
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) return { success: false, message: "OS não encontrada" };

    const CUTTING_STATUSES = ["cortes", "embalagem", "acessorios_plano"];
    if (!CUTTING_STATUSES.includes(m.etapa)) {
      return { success: false, message: "OS não está em etapa de corte" };
    }

    let cut = cuttingPlans.find((c) => c.idMedicao === osId);
    if (!cut) {
      cut = {
        idMedicao: osId,
        corteFeito: false,
        embalagemFeita: false,
        acessoriosFeitos: false,
      };
      cuttingPlans.push(cut);
    }

    if (step === "corte") cut.corteFeito = done;
    else if (step === "embalagem") cut.embalagemFeita = done;
    else cut.acessoriosFeitos = done;

    m.updatedAt = new Date();
    return { success: true };
  },

  getFieldMeasurement(osId: string, type: "orcamento" | "final") {
    const m = measurements.find((x) => x.id === osId && x.type === type);
    if (!m) return null;
    return {
      cliente: m.cliente,
      telefone: m.telefone,
      numeroOrcamento: m.numeroOrcamento,
      dimensions: m.dimensions ?? {},
      items: m.items,
      notes: m.notes ?? "",
      photos: m.photos ?? [],
    };
  },

  saveFieldMeasurement(
    osId: string,
    type: "orcamento" | "final",
    data: {
      items: MeasurementLineItem[];
      notes: string | null;
      photos: string[];
      priority?: "normal" | "alta" | "urgente";
    },
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) {
      return { success: false, message: "OS não encontrada" };
    }

    if (!m.etapa.startsWith("medicao")) {
      return {
        success: false,
        message: "Esta OS não está em etapa de medição.",
      };
    }

    if (!isMeasurementActionAllowed({ etapa: m.etapa }, type)) {
      return {
        success: false,
        message: getMeasurementActionErrorMessage(type),
      };
    }

    m.items = data.items;
    m.notes = data.notes;
    m.photos = data.photos;
    m.status = "medida";
    m.etapa = osStatusFromMeasurementType(type);
    if (data.priority) m.priority = data.priority;
    m.updatedAt = new Date();
    return { success: true };
  },

  sendStageAlert(
    osId: string,
    _stage: "measurement" | "cutting" | "transport" | "installation",
    _message: string,
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) return { success: false, message: "Medição não encontrada" };
    return { success: true };
  },

  moveCard(osId: string, targetStatus: OsStatus): {
    success: true;
  } | {
    success: false;
    message: string;
  } {
    const m = findMeasurement(osId);
    if (!m) {
      return { success: false, message: "OS não encontrada" };
    }

    const fromStatus = m.etapa;
    const allowed = getAllowedTransitions(fromStatus);

    if (!allowed.includes(targetStatus)) {
      return {
        success: false,
        message: `Transição não permitida: ${fromStatus} → ${targetStatus}`,
      };
    }

    if (targetStatus === "revisao") {
      return {
        success: false,
        message: "Use o painel da OS para enviar à revisão com motivo.",
      };
    }

    m.etapa = targetStatus;
    m.updatedAt = new Date();
    return { success: true };
  },

  getById(id: string): OrderDetail | null {
    const m = findMeasurement(id);
    return m ? toOrderDetail(m) : null;
  },

  createMeasurementFromPdf(input: {
    clientName: string;
    clientPhone: string | null;
    budgetReference: string | null;
    description?: string | null;
    scheduledDate?: Date | null;
    assignedUserId?: string | null;
    measurementType?: "orcamento" | "final";
    priority?: "normal" | "alta" | "urgente";
  }): { success: true; osId: string; number: string } | { success: false; message: string } {
    const measurementType = input.measurementType ?? "final";
    const id = crypto.randomUUID();
    const number = `OS-${new Date().getFullYear()}-${String(measurements.length + 1).padStart(5, "0")}`;

    measurements.push({
      id,
      number,
      type: measurementType,
      status: "pendente",
      etapa: osStatusFromMeasurementType(measurementType),
      priority: input.priority ?? "normal",
      assignedUserId: input.assignedUserId ?? null,
      cliente: input.clientName,
      telefone: input.clientPhone,
      numeroOrcamento: input.budgetReference,
      budgetReference: input.budgetReference,
      sourcePdfUrl: null,
      description: input.description ?? "Medição",
      scheduledDate: input.scheduledDate ?? null,
      revisionReason: null,
      revisionFromEtapa: null,
      photos: [],
      updatedAt: new Date(),
    });

    return { success: true, osId: id, number };
  },

  getLogisticsSummaries(osIds: string[]) {
    return Object.fromEntries(
      osIds.map((osId) => {
        const trans = transportStore.find((t) => t.idMedicao === osId);
        const vehicle = trans?.vehicleId
          ? vehicleMockStore.getById(trans.vehicleId)
          : undefined;
        return [
          osId,
          {
            vehiclePlate: vehicle?.plate ?? null,
            vehicleDescription: vehicle?.description ?? null,
          },
        ];
      }),
    );
  },

  getInstallationDraft(osId: string) {
    const inst = installationLogs.find((i) => i.idMedicao === osId);
    if (!inst) return undefined;
    return {
      notes: inst.notes ?? undefined,
      photosBefore: inst.photos?.before ?? [],
      photosAfter: inst.photos?.after ?? [],
      structuralInstalled: inst.structuralInstalled,
      glassInstalled: inst.glassInstalled,
      finalCompleted: inst.finalCompleted,
    };
  },

  saveInstallationDraft(
    osId: string,
    data: {
      notes: string | null;
      photos: { before: string[]; after: string[] };
    },
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) {
      return { success: false, message: "OS não encontrada" };
    }
    if (
      !m.etapa.startsWith("instalacao") &&
      m.etapa !== "concluido"
    ) {
      return {
        success: false,
        message: "Esta OS não está em etapa de instalação.",
      };
    }

    const existing = installationLogs.find((i) => i.idMedicao === osId);
    if (existing) {
      existing.notes = data.notes;
      existing.photos = data.photos;
    } else {
      installationLogs.push({
        idMedicao: osId,
        notes: data.notes,
        photos: data.photos,
      });
    }
    m.updatedAt = new Date();
    return { success: true };
  },

  listByStatus(status: OsStatus): OrderListItem[] {
    return this.list().filter((o) => o.status === status);
  },

  transition(
    osId: string,
    toStatus: OsStatus,
    reason?: string,
  ): TransitionResult {
    const m = findMeasurement(osId);
    if (!m) {
      return { success: false, code: "NOT_FOUND", message: "OS não encontrada." };
    }

    const fromStatus = m.etapa;

    if (!canTransition(fromStatus, toStatus) && toStatus !== "revisao") {
      if (fromStatus !== "revisao") {
        return {
          success: false,
          code: "INVALID_TRANSITION",
          message: `Transição não permitida: ${fromStatus} → ${toStatus}`,
        };
      }
    }

    if (toStatus === "revisao" && !reason) {
      return {
        success: false,
        code: "REVISION_REASON_REQUIRED",
        message: "Informe o motivo da revisão.",
      };
    }

    const ctx = {
      ...loadContext(osId, m),
      revisionFromStatus:
        toStatus === "revisao"
          ? fromStatus
          : fromStatus === "revisao"
            ? m.revisionFromEtapa
            : null,
    };

    try {
      assertTransitionGuards(fromStatus, toStatus, ctx);
    } catch (err) {
      if (err instanceof TransitionValidationError) {
        return { success: false, code: err.code, message: err.message };
      }
      throw err;
    }

    if (toStatus === "revisao") {
      m.revisionReason = reason ?? null;
      m.revisionFromEtapa = fromStatus;
    } else if (fromStatus === "revisao") {
      m.revisionReason = null;
      m.revisionFromEtapa = null;
    }

    m.etapa = toStatus;
    m.updatedAt = new Date();

    return { success: true, status: toStatus };
  },

  /** Helpers de demo para liberar guards */
  addFinalMeasurement(osId: string) {
    const m = findMeasurement(osId);
    if (!m) return;
    m.type = "final";
    m.status = "medida";
    if (!m.dimensions) {
      m.dimensions = { largura: 900, altura: 2100 };
    }
    m.updatedAt = new Date();
  },

  ensureCuttingComplete(osId: string) {
    const existing = cuttingPlans.find((c) => c.idMedicao === osId);
    const data: MockCutting = {
      idMedicao: osId,
      corteFeito: true,
      embalagemFeita: true,
      acessoriosFeitos: true,
    };
    if (existing) Object.assign(existing, data);
    else cuttingPlans.push(data);
  },

  async advance(
    osId: string,
    nextStatus: AdvanceTargetStatus,
    payload?: Record<string, unknown>,
  ): Promise<AdvanceOSResult> {
    const m = findMeasurement(osId);
    if (!m) {
      return { success: false, message: "OS não encontrada" };
    }

    if (!isAllowedAdvance(m.etapa, nextStatus)) {
      return {
        success: false,
        message: `Transição inválida: ${m.etapa} → ${nextStatus}`,
      };
    }

    const err = await validateAdvancePayload(
      nextStatus,
      payload,
      buildAdvanceContext(osId),
      osId,
    );
    if (err) {
      return { success: false, message: err };
    }

    const p = payload ?? {};

    if (nextStatus === "medicao_final") {
      m.dimensions = (p.dimensions as Record<string, number>) ?? m.dimensions ?? {};
      m.photos = (p.photos as string[]) ?? m.photos ?? [];
      m.notes = (p.notes as string) ?? m.notes ?? null;
      m.status = "medida";
      m.type = "final";
    }
    if (
      nextStatus === "cortes" ||
      nextStatus === "embalagem" ||
      nextStatus === "acessorios_plano"
    ) {
      const existing = cuttingPlans.find((c) => c.idMedicao === osId);
      const data: MockCutting = {
        idMedicao: osId,
        corteFeito: existing?.corteFeito ?? false,
        embalagemFeita: existing?.embalagemFeita ?? false,
        acessoriosFeitos: existing?.acessoriosFeitos ?? false,
        operatorId: (p.operatorId as string) ?? existing?.operatorId ?? null,
        notes: (p.notes as string) ?? existing?.notes ?? null,
      };
      if (existing) Object.assign(existing, data);
      else cuttingPlans.push(data);
    }
    if (nextStatus === "transporte_perfil") {
      const vehicleId = p.vehicleId as string;
      vehicleMockStore.assignToTransport(osId, vehicleId);
      const t = transportStore.find((x) => x.idMedicao === osId);
      if (t) t.vehicleId = vehicleId;
      else transportStore.push({ idMedicao: osId, vehicleId });
    }
    if (
      nextStatus === "transporte_estrutural" ||
      nextStatus === "transporte_perfis_total" ||
      nextStatus === "transporte_acessorios" ||
      nextStatus === "transporte_levar_vidro"
    ) {
      const t = transportStore.find((x) => x.idMedicao === osId);
      const itemsChecked = p.itemsChecked as Record<string, boolean>;
      const vehicleId = (p.vehicleId as string | undefined) ?? t?.vehicleId;
      if (t) {
        t.itemsChecked = itemsChecked;
        if (vehicleId) t.vehicleId = vehicleId;
      } else {
        transportStore.push({
          idMedicao: osId,
          itemsChecked,
          vehicleId: vehicleId ?? null,
        });
      }
      if (nextStatus === "transporte_levar_vidro") {
        vehicleMockStore.releaseFromTransport(osId);
      }
    }
    if (
      nextStatus.startsWith("instalacao") ||
      nextStatus === "concluido"
    ) {
      this.ensureInstallationComplete(osId);
    }

    m.etapa = nextStatus;
    m.updatedAt = new Date();

    return {
      success: true,
      message: `OS avançada para ${nextStatus.replace(/_/g, " ")}`,
      newStatus: nextStatus,
    };
  },

  ensureInstallationComplete(osId: string) {
    const existing = installationLogs.find((i) => i.idMedicao === osId);
    const data = {
      idMedicao: osId,
      photos: {
        before: ["https://example.com/before.jpg"],
        after: ["https://example.com/after.jpg"],
      },
    };
    if (existing) Object.assign(existing, data);
    else installationLogs.push(data);
  },

  deleteMeasurementOs(
    osId: string,
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) {
      return { success: false, message: "Medição não encontrada." };
    }
    if (!m.etapa.startsWith("medicao")) {
      return {
        success: false,
        message: "Só é possível excluir medições ainda em etapa de medição.",
      };
    }

    measurements = measurements.filter((x) => x.id !== osId);
    cuttingPlans = cuttingPlans.filter((c) => c.idMedicao !== osId);
    installationLogs = installationLogs.filter((i) => i.idMedicao !== osId);
    transportStore = transportStore.filter((t) => t.idMedicao !== osId);

    return { success: true };
  },
};
