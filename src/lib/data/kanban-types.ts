import type {
  OsStatus,
  MeasurementDbStatus,
  MeasurementDbType,
} from "@/db/schema";

export type CuttingSteps = {
  corte: boolean;
  embalagem: boolean;
  acessorios: boolean;
};

export type TransportKanbanSteps = {
  levarPerfilEstrutural: boolean;
  levarPerfilTotal: boolean;
  levarAcessorios: boolean;
  levarVidro: boolean;
};

export type InstallationKanbanSteps = {
  instalacaoEstruturalFeita: boolean;
  instalacaoVidrosFeita: boolean;
};

export type KanbanOrderItem = {
  id: string;
  number: string;
  budgetReference: string | null;
  status: OsStatus;
  type: MeasurementDbType;
  measurementStatus: MeasurementDbStatus;
  clientName: string;
  priority: "normal" | "alta" | "urgente";
  scheduledDate: Date | null;
  /** Momento em que a medição entrou na etapa atual (proxy para tempo na coluna) */
  updatedAt: Date;
  /** true quando o medidor já registrou itens de medição (items não vazio). */
  hasMeasurement: boolean;
  /** Presente quando a medição está no plano de corte */
  cuttingSteps: CuttingSteps | null;
  /** Presente quando a medição está em fase de transporte */
  transportSteps: TransportKanbanSteps | null;
  /** Presente quando a medição está em fase de instalação */
  installationSteps: InstallationKanbanSteps | null;
};

/** Restaura `Date` após serialização de Server Actions. */
export function reviveKanbanOrders(
  orders: KanbanOrderItem[],
): KanbanOrderItem[] {
  return orders.map((order) => ({
    ...order,
    scheduledDate: order.scheduledDate
      ? new Date(order.scheduledDate)
      : null,
    updatedAt: new Date(order.updatedAt),
  }));
}
