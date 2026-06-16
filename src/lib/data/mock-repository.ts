import type {
  MeasurementDbStatus,
  MeasurementDbType,
  MeasurementPriority,
  OsStatus,
} from "@/db/schema";
import type { OrderDetail, OrderListItem } from "./types";
import { getAllowedTransitions } from "@/lib/workflow/measurement-flow";
import {
  getMeasurementActionErrorMessage,
  isMeasurementActionAllowed,
  measurementTypeFromOsStatus,
  osStatusFromMeasurementType,
} from "@/lib/workflow/measurement-actions";
import { vehicleMockStore } from "@/lib/data/admin-mock-store";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import {
  aggregateInstallationStepsFromItems,
  aggregateTransportStepsFromItems,
} from "@/lib/workflow/aggregates";
import type { InstallationDailyNote, MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  collectDriverIdsFromMeasurementItems,
  mergeDriverIds,
} from "@/lib/logistics/transport-driver-access";
import { collectInstallerIdsFromMeasurementItems } from "@/lib/installation/installation-installer-access";

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
  vidrosFeitos: boolean;
  cutterNotes?: string | null;
};

type MockTransport = {
  idMedicao: string;
  vehicleId?: string | null;
  driverId?: string | null;
};

type MockInstallation = {
  idMedicao: string;
  photos: { service?: string[] } | null;
  notes?: string | null;
  dailyNotes?: InstallationDailyNote[];
  instalacaoEstruturalFeita?: boolean;
  instalacaoVidrosFeita?: boolean;
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
  const instLog = installationLogs.find((i) => i.idMedicao === m.id);
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
    clientPhone: m.telefone,
    sourcePdfUrl: m.sourcePdfUrl,
    notes: m.notes ?? null,
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
    updatedAt: new Date(),
  },
];

let cuttingPlans: MockCutting[] = [
  {
    idMedicao: "a1111111-1111-4111-8111-111111111103",
    corteFeito: true,
    embalagemFeita: false,
    acessoriosFeitos: false,
    vidrosFeitos: false,
  },
  {
    idMedicao: "a1111111-1111-4111-8111-111111111104",
    corteFeito: true,
    embalagemFeita: true,
    acessoriosFeitos: true,
    vidrosFeitos: true,
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
    driverId: DEMO_MOTORISTA,
  },
];

vehicleMockStore.assignToTransport(
  "a1111111-1111-4111-8111-111111111106",
  "b1000000-0000-4000-8000-000000000001",
);

function findMeasurement(id: string): MockMeasurement | undefined {
  return measurements.find((m) => m.id === id);
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
      const isTransportPhase =
        m.etapa === "transporte_perfil" ||
        m.etapa === "transporte_estrutural" ||
        m.etapa === "transporte_perfis_total" ||
        m.etapa === "transporte_acessorios" ||
        m.etapa === "transporte_levar_vidro";
      const isInstallationPhase =
        m.etapa === "instalacao_estrutural" ||
        m.etapa === "instalacao_vidros" ||
        m.etapa === "concluido";

      const cuttingStepsData = cut
        ? {
            corte: cut.corteFeito,
            embalagem: cut.embalagemFeita,
            acessorios: cut.acessoriosFeitos,
            vidros: cut.vidrosFeitos,
          }
        : null;

      const hasPendingCutting =
        isTransportPhase &&
        cuttingStepsData &&
        (!cuttingStepsData.corte ||
          !cuttingStepsData.embalagem ||
          !cuttingStepsData.acessorios ||
          !cuttingStepsData.vidros);

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
        cuttingSteps:
          (isCortePhase || hasPendingCutting) && cuttingStepsData
            ? cuttingStepsData
            : null,
        transportSteps: isTransportPhase
          ? {
              levarPerfilEstrutural: false,
              levarPerfilTotal: false,
              levarAcessorios: false,
              levarVidros: false,
              transporteConcluido: false,
            }
          : null,
        installationSteps: isInstallationPhase
          ? {
              instalacaoEstruturalFeita: false,
              instalacaoVidrosFeita: false,
              instalacaoAcabamentoFeito: false,
            }
          : null,
      };
    });
  },

  getCuttingDetail(osId: string) {
    const m = findMeasurement(osId);
    const cut = cuttingPlans.find((c) => c.idMedicao === osId);
    const items = (m?.items ?? []) as import("@/lib/workflow/schemas").MeasurementLineItem[];
    return {
      measurement: m
        ? {
            cliente: m.cliente,
            items,
            photos: m.photos ?? [],
            notes: m.notes ?? null,
            dimensions: m.dimensions ?? null,
          }
        : null,
      cuttingSteps: {
        corteFeito: cut?.corteFeito ?? false,
        embalagemFeita: cut?.embalagemFeita ?? false,
        acessoriosFeitos: cut?.acessoriosFeitos ?? false,
        vidrosFeitos: cut?.vidrosFeitos ?? false,
      },
      cutterNotes: cut?.cutterNotes ?? null,
    };
  },

  updateCuttingNotes(
    osId: string,
    notes: string | null,
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) return { success: false, message: "OS não encontrada" };

    const CUTTING_STATUSES = ["cortes", "embalagem", "acessorios_plano"];

    let cut = cuttingPlans.find((c) => c.idMedicao === osId);
    const cuttingSteps = {
      corteFeito: cut?.corteFeito ?? false,
      embalagemFeita: cut?.embalagemFeita ?? false,
      acessoriosFeitos: cut?.acessoriosFeitos ?? false,
      vidrosFeitos: cut?.vidrosFeitos ?? false,
    };
    const canEditCutting =
      CUTTING_STATUSES.includes(m.etapa) ||
      (m.etapa.startsWith("transporte_") &&
        (!cuttingSteps.corteFeito ||
          !cuttingSteps.embalagemFeita ||
          !cuttingSteps.acessoriosFeitos ||
          !cuttingSteps.vidrosFeitos));

    if (!canEditCutting) {
      return { success: false, message: "OS não está em etapa de corte" };
    }

    if (!cut) {
      cut = {
        idMedicao: osId,
        corteFeito: false,
        embalagemFeita: false,
        acessoriosFeitos: false,
        vidrosFeitos: false,
        cutterNotes: notes,
      };
      cuttingPlans.push(cut);
    } else {
      cut.cutterNotes = notes;
    }

    m.updatedAt = new Date();
    return { success: true };
  },

  updateCuttingStep(
    osId: string,
    step: "corte" | "embalagem" | "acessorios" | "vidros",
    done: boolean,
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) return { success: false, message: "OS não encontrada" };

    const CUTTING_STATUSES = ["cortes", "embalagem", "acessorios_plano"];

    let cut = cuttingPlans.find((c) => c.idMedicao === osId);
    const cuttingSteps = {
      corteFeito: cut?.corteFeito ?? false,
      embalagemFeita: cut?.embalagemFeita ?? false,
      acessoriosFeitos: cut?.acessoriosFeitos ?? false,
      vidrosFeitos: cut?.vidrosFeitos ?? false,
    };
    const canEditCutting =
      CUTTING_STATUSES.includes(m.etapa) ||
      (m.etapa.startsWith("transporte_") &&
        (!cuttingSteps.corteFeito ||
          !cuttingSteps.embalagemFeita ||
          !cuttingSteps.acessoriosFeitos ||
          !cuttingSteps.vidrosFeitos));

    if (!canEditCutting) {
      return { success: false, message: "OS não está em etapa de corte" };
    }

    if (!cut) {
      cut = {
        idMedicao: osId,
        corteFeito: false,
        embalagemFeita: false,
        acessoriosFeitos: false,
        vidrosFeitos: false,
      };
      cuttingPlans.push(cut);
    }

    if (step === "corte") cut.corteFeito = done;
    else if (step === "embalagem") cut.embalagemFeita = done;
    else if (step === "acessorios") cut.acessoriosFeitos = done;
    else cut.vidrosFeitos = done;

    if (step === "corte" && done && cut.corteFeito && ["cortes", "embalagem", "acessorios_plano"].includes(m.etapa)) {
      m.etapa = "transporte_perfil";
    }

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
    m.type = type;
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

    m.etapa = targetStatus;
    const syncedType = measurementTypeFromOsStatus(targetStatus);
    if (syncedType) m.type = syncedType;
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

  getDriverIdsByOsIds(osIds: string[]) {
    return Object.fromEntries(
      osIds.map((osId) => {
        const measurement = findMeasurement(osId);
        const itemDrivers = collectDriverIdsFromMeasurementItems(
          measurement?.items,
        );
        const transport = transportStore.find((t) => t.idMedicao === osId);
        return [
          osId,
          mergeDriverIds(
            itemDrivers,
            transport?.driverId ? [transport.driverId] : [],
          ),
        ];
      }),
    );
  },

  getInstallerIdsByOsIds(osIds: string[]) {
    return Object.fromEntries(
      osIds.map((osId) => {
        const measurement = findMeasurement(osId);
        return [
          osId,
          collectInstallerIdsFromMeasurementItems(measurement?.items),
        ];
      }),
    );
  },

  getTransportStepsForOrders(osIds: string[]) {
    return Object.fromEntries(
      osIds.map((osId) => {
        const m = findMeasurement(osId);
        const items = (m?.items ?? []) as MeasurementLineItem[];
        return [osId, aggregateTransportStepsFromItems(items)];
      }),
    );
  },

  updateItemTransportNotes(
    osId: string,
    itemId: string,
    observacoes: string | null,
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) return { success: false, message: "OS não encontrada" };

    const items = (m.items ?? []) as MeasurementLineItem[];
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return { success: false, message: "Vão não encontrado" };

    const prev = items[index].transportProgress ?? {
      perfilEstrutural: false,
      perfilTotal: false,
      acessorios: false,
      vidros: false,
    };

    items[index] = {
      ...items[index],
      transportProgress: {
        ...prev,
        observacoes: observacoes ?? undefined,
      },
    };

    m.items = items;
    m.updatedAt = new Date();
    return { success: true };
  },

  getInstallationStepsForOrders(osIds: string[]) {
    return Object.fromEntries(
      osIds.map((osId) => {
        const m = findMeasurement(osId);
        const items = (m?.items ?? []) as MeasurementLineItem[];
        return [osId, aggregateInstallationStepsFromItems(items)];
      }),
    );
  },

  saveInstallationServicePhotos(
    osId: string,
    servicePhotos: string[],
  ): { success: true } | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) {
      return { success: false, message: "OS não encontrada" };
    }

    const cut = cuttingPlans.find((c) => c.idMedicao === osId);
    const cuttingSteps = {
      corteFeito: cut?.corteFeito ?? false,
      embalagemFeita: cut?.embalagemFeita ?? false,
      acessoriosFeitos: cut?.acessoriosFeitos ?? false,
      vidrosFeitos: cut?.vidrosFeitos ?? false,
    };

    if (!canOperateInstallationModule(m.etapa, cuttingSteps)) {
      return {
        success: false,
        message: "Aguardando conclusão do corte para liberar instalação.",
      };
    }

    const existing = installationLogs.find((i) => i.idMedicao === osId);
    if (existing) {
      existing.photos = {
        ...existing.photos,
        service: servicePhotos,
      };
    } else {
      installationLogs.push({
        idMedicao: osId,
        photos: { service: servicePhotos },
      });
    }
    m.updatedAt = new Date();
    return { success: true };
  },

  saveInstallationDailyNote(
    osId: string,
    date: string,
    text: string,
  ):
    | { success: true; note: InstallationDailyNote }
    | { success: false; message: string } {
    const m = findMeasurement(osId);
    if (!m) {
      return { success: false, message: "OS não encontrada" };
    }

    const cut = cuttingPlans.find((c) => c.idMedicao === osId);
    const cuttingSteps = {
      corteFeito: cut?.corteFeito ?? false,
      embalagemFeita: cut?.embalagemFeita ?? false,
      acessoriosFeitos: cut?.acessoriosFeitos ?? false,
      vidrosFeitos: cut?.vidrosFeitos ?? false,
    };

    if (!canOperateInstallationModule(m.etapa, cuttingSteps)) {
      return {
        success: false,
        message: "Aguardando conclusão do corte para liberar instalação.",
      };
    }

    const now = new Date().toISOString();
    const existing = installationLogs.find((i) => i.idMedicao === osId);
    const currentNotes = existing?.dailyNotes ?? [];
    const previous = currentNotes.find((entry) => entry.date === date);
    const note: InstallationDailyNote = {
      date,
      text,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    const nextNotes = previous
      ? currentNotes.map((entry) => (entry.date === date ? note : entry))
      : [...currentNotes, note].sort((a, b) => b.date.localeCompare(a.date));

    if (existing) {
      existing.dailyNotes = nextNotes;
    } else {
      installationLogs.push({
        idMedicao: osId,
        photos: null,
        dailyNotes: nextNotes,
      });
    }

    m.updatedAt = new Date();
    return { success: true, note };
  },

  listByStatus(status: OsStatus): OrderListItem[] {
    return this.list().filter((o) => o.status === status);
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
