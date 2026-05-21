import type { OsStatus } from "@/db/schema";
import type { OrderDetail, OrderListItem } from "./types";
import {
  assertTransitionGuards,
  canTransition,
  isAccessoriesComplete,
  isPackagingComplete,
  TransitionValidationError,
} from "@/lib/workflow/status-machine";
import type { TransitionResult } from "@/actions/service-order";
import type { AdvanceOSResult } from "@/actions/os-actions";
import {
  isAllowedAdvance,
  type AdvanceTargetStatus,
} from "@/lib/workflow/advance-flow";
import { STATUS_FLOW } from "@/lib/workflow/status-machine";
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

type MockMeasurement = {
  id: string;
  osId: string;
  type: "orcamento" | "final";
  cliente?: string | null;
  telefone?: string | null;
  numeroOrcamento?: string | null;
  dimensions?: Record<string, number>;
  items?: import("@/lib/workflow/schemas").MeasurementLineItem[];
  notes?: string | null;
  photos?: string[];
};
type MockCutting = {
  osId: string;
  status: string;
  cuts?: Array<{ item: string; length: number; width: number; qty: number }>;
  packaging: Record<string, boolean> | null;
  accessories?: Record<string, number> | null;
};

type MockTransport = {
  osId: string;
  itemsChecked?: Record<string, boolean> | null;
  vehicleId?: string | null;
};
type MockInstallation = {
  osId: string;
  photos: { before?: string[]; after?: string[] } | null;
  notes?: string | null;
  structuralInstalled?: boolean;
  glassInstalled?: boolean;
  finalCompleted?: boolean;
};

type MockOrder = OrderDetail;

const DEMO_MEDIDOR = "a1000000-0000-4000-8000-000000000002";
const DEMO_CORTADOR = "a1000000-0000-4000-8000-000000000003";
const DEMO_MOTORISTA = "a1000000-0000-4000-8000-000000000004";
const DEMO_INSTALADOR = "a1000000-0000-4000-8000-000000000005";

function measurementContactForOs(osId: string): {
  clientName: string;
  clientPhone: string | null;
} {
  const m =
    measurements.find((x) => x.osId === osId && x.type === "final") ??
    measurements.find((x) => x.osId === osId);
  return {
    clientName: m?.cliente?.trim() || "Cliente não informado",
    clientPhone: m?.telefone ?? null,
  };
}

function withMeasurementContact(order: MockOrder): OrderDetail {
  const contact = measurementContactForOs(order.id);
  return { ...order, ...contact };
}

let orders: MockOrder[] = [
  {
    id: "a1111111-1111-4111-8111-111111111101",
    number: "OS-2026-00001",
    clientName: "Residencial Solar",
    clientPhone: "(11) 98765-4321",
    status: "medicao_final",
    measurementFlow: "profissional_mediu",
    assignedUserId: DEMO_MEDIDOR,
    priority: "normal",
    scheduledDate: new Date("2026-05-20"),
    description: "Sacada envidraçada — 4 folhas",
    revisionReason: null,
    revisionFromStatus: null,
    budgetReference: "ORC-2026-0001",
    sourcePdfUrl: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111102",
    number: "OS-2026-00002",
    clientName: "Comercial Vidro & Cia",
    clientPhone: "(11) 91234-5678",
    status: "medicao_orcamento",
    measurementFlow: "cliente_informou",
    assignedUserId: null,
    priority: "alta",
    scheduledDate: new Date("2026-05-22"),
    description: "Fachada comercial — perfil structurado",
    revisionReason: null,
    revisionFromStatus: null,
    budgetReference: null,
    sourcePdfUrl: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111103",
    number: "OS-2026-00003",
    clientName: "Condomínio Horizonte",
    clientPhone: "(11) 99876-5432",
    status: "cortes",
    measurementFlow: "profissional_mediu",
    assignedUserId: DEMO_CORTADOR,
    priority: "urgente",
    scheduledDate: new Date("2026-05-18"),
    description: "Box blindex banheiro social",
    revisionReason: null,
    revisionFromStatus: null,
    budgetReference: null,
    sourcePdfUrl: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111104",
    number: "OS-2026-00004",
    clientName: "Residencial Solar",
    clientPhone: "(11) 98765-4321",
    status: "embalagem",
    measurementFlow: "cliente_informou",
    assignedUserId: DEMO_CORTADOR,
    priority: "normal",
    scheduledDate: new Date("2026-05-25"),
    description: "Janelas quartos — 6 unidades",
    revisionReason: null,
    revisionFromStatus: null,
    budgetReference: null,
    sourcePdfUrl: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111105",
    number: "OS-2026-00005",
    clientName: "Comercial Vidro & Cia",
    clientPhone: "(11) 91234-5678",
    status: "medicao_final",
    measurementFlow: "cliente_informou",
    assignedUserId: null,
    priority: "normal",
    scheduledDate: new Date("2026-05-21"),
    description: "Guarda-corpo varanda — medição final pós-aprovação",
    revisionReason: null,
    revisionFromStatus: null,
    budgetReference: null,
    sourcePdfUrl: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111106",
    number: "OS-2026-00006",
    clientName: "Condomínio Horizonte",
    clientPhone: "(11) 99876-5432",
    status: "transporte_perfil",
    measurementFlow: "cliente_informou",
    assignedUserId: DEMO_MOTORISTA,
    priority: "alta",
    scheduledDate: new Date("2026-05-23"),
    description: "Entrega esquadrias — bloco B",
    revisionReason: null,
    revisionFromStatus: null,
    budgetReference: null,
    sourcePdfUrl: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111107",
    number: "OS-2026-00007",
    clientName: "Residencial Solar",
    clientPhone: "(11) 98765-4321",
    status: "instalacao_estrutural",
    measurementFlow: "cliente_informou",
    assignedUserId: DEMO_INSTALADOR,
    priority: "urgente",
    scheduledDate: new Date("2026-05-24"),
    description: "Instalação estrutural sacada",
    revisionReason: null,
    revisionFromStatus: null,
    budgetReference: null,
    sourcePdfUrl: null,
    updatedAt: new Date(),
  },
  {
    id: "a1111111-1111-4111-8111-111111111108",
    number: "OS-2026-00008",
    clientName: "Condomínio Horizonte",
    clientPhone: "(11) 99876-5432",
    status: "medicao_final",
    measurementFlow: "profissional_mediu",
    assignedUserId: DEMO_MEDIDOR,
    priority: "normal",
    scheduledDate: new Date("2026-05-20"),
    description: "Nova medição — cliente solicitou visita técnica",
    revisionReason: null,
    revisionFromStatus: null,
    budgetReference: null,
    sourcePdfUrl: null,
    updatedAt: new Date(),
  },
];

let measurements: MockMeasurement[] = [
  {
    id: "m1111111-1111-4111-8111-111111111101",
    osId: "a1111111-1111-4111-8111-111111111101",
    type: "final",
    cliente: "Residencial Solar",
    telefone: "(11) 98765-4321",
    numeroOrcamento: "ORC-2026-0001",
    photos: [],
  },
  {
    id: "m1111111-1111-4111-8111-111111111102",
    osId: "a1111111-1111-4111-8111-111111111103",
    type: "final",
    dimensions: { largura: 900, altura: 2100 },
  },
  {
    id: "m1111111-1111-4111-8111-111111111103",
    osId: "a1111111-1111-4111-8111-111111111104",
    type: "orcamento",
  },
  {
    id: "m1111111-1111-4111-8111-111111111104",
    osId: "a1111111-1111-4111-8111-111111111104",
    type: "final",
  },
];

let cuttingPlans: MockCutting[] = [
  {
    osId: "a1111111-1111-4111-8111-111111111104",
    status: "concluido",
    packaging: {
      structuralProfile: true,
      totalProfiles: true,
      accessories: true,
      glass: true,
    },
  },
];

let installationLogs: MockInstallation[] = [
  {
    osId: "a1111111-1111-4111-8111-111111111107",
    photos: null,
    notes: null,
  },
];
let transportStore: MockTransport[] = [
  {
    osId: "a1111111-1111-4111-8111-111111111106",
    vehicleId: "b1000000-0000-4000-8000-000000000001",
  },
];

vehicleMockStore.assignToTransport(
  "a1111111-1111-4111-8111-111111111106",
  "b1000000-0000-4000-8000-000000000001",
);

function buildAdvanceContext(osId: string): AdvanceStepContext {
  const hasFinalMeasurement = measurements.some(
    (m) => m.osId === osId && m.type === "final",
  );
  const cut = cuttingPlans.find((c) => c.osId === osId);
  const trans = transportStore.find((t) => t.osId === osId);
  const inst = installationLogs.find((i) => i.osId === osId);

  return {
    hasFinalMeasurement,
    cuttingPlan: cut
      ? {
          cuts: cut.cuts ?? null,
          status: cut.status,
          packaging: cut.packaging,
          accessories: cut.accessories ?? null,
        }
      : null,
    transportItemsChecked: trans?.itemsChecked ?? null,
    installation: inst ? { photos: inst.photos } : null,
  };
}

function loadContext(osId: string, order: MockOrder) {
  const hasFinalMeasurement = measurements.some(
    (m) => m.osId === osId && m.type === "final",
  );
  const hasBudgetMeasurement = measurements.some(
    (m) => m.osId === osId && m.type === "orcamento",
  );
  const cut = cuttingPlans.find((c) => c.osId === osId);
  const trans = transportStore.find((t) => t.osId === osId);
  const inst = installationLogs.find((i) => i.osId === osId);
  const photos = inst?.photos;
  const hasBeforeAfter =
    !!photos &&
    (photos.before?.length ?? 0) > 0 &&
    (photos.after?.length ?? 0) > 0;

  return {
    measurementFlow: order.measurementFlow,
    hasFinalMeasurement,
    hasBudgetMeasurement,
    cuttingPlanStatus: cut?.status ?? null,
    packagingComplete: isPackagingComplete(cut?.packaging ?? undefined),
    accessoriesComplete: isAccessoriesComplete(cut?.accessories ?? undefined),
    transportItemsChecked: trans?.itemsChecked ?? null,
    installationHasPhotos: hasBeforeAfter,
    revisionFromStatus:
      order.status === "revisao" ? order.revisionFromStatus : null,
  };
}

function toListItem(o: MockOrder): OrderListItem {
  const contact = measurementContactForOs(o.id);
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    measurementFlow: o.measurementFlow,
    priority: o.priority,
    clientName: contact.clientName,
    assignedUserId: o.assignedUserId,
    scheduledDate: o.scheduledDate,
    updatedAt: o.updatedAt,
    budgetReference: o.budgetReference,
  };
}

export const mockRepository = {
  list(): OrderListItem[] {
    return orders.map(toListItem).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  },

  listKanban() {
    return orders.map((o) => {
      const contact = measurementContactForOs(o.id);
      return {
        id: o.id,
        number: o.number,
        budgetReference: o.budgetReference,
        status: o.status,
        measurementFlow: o.measurementFlow,
        clientName: contact.clientName,
        priority: o.priority,
        scheduledDate: o.scheduledDate,
        updatedAt: o.updatedAt,
      };
    });
  },

  getFieldMeasurement(osId: string, type: "orcamento" | "final") {
    const m = measurements.find((x) => x.osId === osId && x.type === type);
    if (!m) return null;
    return {
      cliente: m.cliente ?? null,
      telefone: m.telefone ?? null,
      numeroOrcamento: m.numeroOrcamento ?? null,
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
      items: import("@/lib/workflow/schemas").MeasurementLineItem[];
      notes: string | null;
      photos: string[];
    },
  ): { success: true } | { success: false; message: string } {
    const order = orders.find((x) => x.id === osId);
    if (!order) {
      return { success: false, message: "OS não encontrada" };
    }

    if (!order.status.startsWith("medicao")) {
      return {
        success: false,
        message: "Esta OS não está em etapa de medição.",
      };
    }

    const orderContext = { status: order.status };

    if (!isMeasurementActionAllowed(orderContext, type)) {
      return {
        success: false,
        message: getMeasurementActionErrorMessage(type),
      };
    }

    const existing = measurements.find(
      (m) => m.osId === osId && m.type === type,
    );

    if (existing) {
      existing.items = data.items;
      existing.notes = data.notes;
      existing.photos = data.photos;
    } else {
      measurements.push({
        id: crypto.randomUUID(),
        osId,
        type,
        items: data.items,
        notes: data.notes,
        photos: data.photos,
      });
    }

    order.status = osStatusFromMeasurementType(type);
    order.updatedAt = new Date();
    return { success: true };
  },

  moveCard(osId: string, targetStatus: OsStatus): {
    success: true;
  } | {
    success: false;
    message: string;
  } {
    const order = orders.find((x) => x.id === osId);
    if (!order) {
      return { success: false, message: "OS não encontrada" };
    }

    const fromStatus = order.status;
    const allowed = getAllowedTransitions(fromStatus, order.measurementFlow);

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

    order.status = targetStatus;
    order.updatedAt = new Date();

    return { success: true };
  },

  getById(id: string): OrderDetail | null {
    const o = orders.find((x) => x.id === id);
    return o ? withMeasurementContact(o) : null;
  },

  createMeasurementFromPdf(input: {
    clientName: string;
    clientPhone: string | null;
    budgetReference: string | null;
    description?: string | null;
    scheduledDate?: Date | null;
    assignedUserId?: string | null;
    measurementType?: "orcamento" | "final";
  }): { success: true; osId: string; number: string } | { success: false; message: string } {
    const measurementType = input.measurementType ?? "final";
    const id = crypto.randomUUID();
    const number = `OS-${new Date().getFullYear()}-${String(orders.length + 1).padStart(5, "0")}`;

    orders.push({
      id,
      number,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      status: osStatusFromMeasurementType(measurementType),
      measurementFlow: "profissional_mediu",
      assignedUserId: input.assignedUserId ?? null,
      priority: "normal",
      scheduledDate: input.scheduledDate ?? null,
      description: input.description ?? "Medição",
      revisionReason: null,
      revisionFromStatus: null,
      budgetReference: input.budgetReference,
      sourcePdfUrl: null,
      updatedAt: new Date(),
    });

    measurements.push({
      id: crypto.randomUUID(),
      osId: id,
      type: measurementType,
      cliente: input.clientName,
      telefone: input.clientPhone,
      numeroOrcamento: input.budgetReference,
      photos: [],
    });

    return { success: true, osId: id, number };
  },

  getLogisticsSummaries(osIds: string[]) {
    return Object.fromEntries(
      osIds.map((osId) => {
        const trans = transportStore.find((t) => t.osId === osId);
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
    const inst = installationLogs.find((i) => i.osId === osId);
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
    const order = orders.find((x) => x.id === osId);
    if (!order) {
      return { success: false, message: "OS não encontrada" };
    }
    if (
      !order.status.startsWith("instalacao") &&
      order.status !== "concluido"
    ) {
      return {
        success: false,
        message: "Esta OS não está em etapa de instalação.",
      };
    }

    const existing = installationLogs.find((i) => i.osId === osId);
    if (existing) {
      existing.notes = data.notes;
      existing.photos = data.photos;
    } else {
      installationLogs.push({
        osId,
        notes: data.notes,
        photos: data.photos,
      });
    }
    order.updatedAt = new Date();
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
    const order = orders.find((x) => x.id === osId);
    if (!order) {
      return { success: false, code: "NOT_FOUND", message: "OS não encontrada." };
    }

    const fromStatus = order.status;

    if (!canTransition(fromStatus, toStatus, order.measurementFlow) && toStatus !== "revisao") {
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
      ...loadContext(osId, order),
      revisionFromStatus:
        toStatus === "revisao"
          ? fromStatus
          : fromStatus === "revisao"
            ? order.revisionFromStatus
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
      order.revisionReason = reason ?? null;
      order.revisionFromStatus = fromStatus;
    } else if (fromStatus === "revisao") {
      order.revisionReason = null;
      order.revisionFromStatus = null;
    }

    order.status = toStatus;
    order.updatedAt = new Date();

    return { success: true, status: toStatus };
  },

  /** Helpers de demo para liberar guards */
  addFinalMeasurement(osId: string) {
    if (measurements.some((m) => m.osId === osId && m.type === "final")) return;
    measurements.push({
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      osId,
      type: "final",
    });
  },

  ensureCuttingComplete(osId: string) {
    const existing = cuttingPlans.find((c) => c.osId === osId);
    const data: MockCutting = {
      osId,
      status: "concluido",
      cuts: [
        { item: "Perfil", length: 2100, width: 50, qty: 4 },
        { item: "Vidro", length: 2000, width: 800, qty: 2 },
      ],
      packaging: {
        structuralProfile: true,
        totalProfiles: true,
        accessories: true,
        glass: true,
      },
    };
    if (existing) Object.assign(existing, data);
    else cuttingPlans.push(data);
  },

  async advance(
    osId: string,
    nextStatus: AdvanceTargetStatus,
    payload?: Record<string, unknown>,
  ): Promise<AdvanceOSResult> {
    const order = orders.find((x) => x.id === osId);
    if (!order) {
      return { success: false, message: "OS não encontrada" };
    }

    if (!isAllowedAdvance(order.status, nextStatus, order.measurementFlow)) {
      return {
        success: false,
        message: `Transição inválida: ${order.status} → ${nextStatus}`,
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
      this.addFinalMeasurement(osId);
    }
    if (
      nextStatus === "cortes" ||
      nextStatus === "embalagem" ||
      nextStatus === "acessorios_plano"
    ) {
      const existing = cuttingPlans.find((c) => c.osId === osId);
      const cuttingComplete =
        nextStatus === "embalagem" || nextStatus === "acessorios_plano";
      const data: MockCutting = {
        osId,
        cuts: (p.cuts as MockCutting["cuts"]) ?? existing?.cuts ?? [
          { item: "Perfil", length: 2100, width: 50, qty: 4 },
        ],
        packaging:
          (p.packaging as Record<string, boolean>) ??
          existing?.packaging ??
          {},
        status: cuttingComplete ? "concluido" : "em_andamento",
      };
      if (existing) Object.assign(existing, data);
      else cuttingPlans.push(data);
    }
    if (nextStatus === "transporte_perfil") {
      const vehicleId = p.vehicleId as string;
      vehicleMockStore.assignToTransport(osId, vehicleId);
      const t = transportStore.find((x) => x.osId === osId);
      if (t) t.vehicleId = vehicleId;
      else transportStore.push({ osId, vehicleId });
    }
    if (
      nextStatus === "transporte_estrutural" ||
      nextStatus === "transporte_perfis_total" ||
      nextStatus === "transporte_acessorios" ||
      nextStatus === "transporte_levar_vidro"
    ) {
      const t = transportStore.find((x) => x.osId === osId);
      const itemsChecked = p.itemsChecked as Record<string, boolean>;
      const vehicleId = (p.vehicleId as string | undefined) ?? t?.vehicleId;
      if (t) {
        t.itemsChecked = itemsChecked;
        if (vehicleId) t.vehicleId = vehicleId;
      } else {
        transportStore.push({ osId, itemsChecked, vehicleId: vehicleId ?? null });
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

    order.status = nextStatus;
    order.updatedAt = new Date();

    return {
      success: true,
      message: `OS avançada para ${nextStatus.replace(/_/g, " ")}`,
      newStatus: nextStatus,
    };
  },

  ensureInstallationComplete(osId: string) {
    const existing = installationLogs.find((i) => i.osId === osId);
    const data = {
      osId,
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
    const order = orders.find((o) => o.id === osId);
    if (!order) {
      return { success: false, message: "Medição não encontrada." };
    }
    if (!order.status.startsWith("medicao")) {
      return {
        success: false,
        message: "Só é possível excluir medições ainda em etapa de medição.",
      };
    }

    orders = orders.filter((o) => o.id !== osId);
    measurements = measurements.filter((m) => m.osId !== osId);
    cuttingPlans = cuttingPlans.filter((c) => c.osId !== osId);
    installationLogs = installationLogs.filter((i) => i.osId !== osId);
    transportStore = transportStore.filter((t) => t.osId !== osId);

    return { success: true };
  },
};
