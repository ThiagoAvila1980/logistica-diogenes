import type {
  DriverStats,
  LogisticsReportData,
  SubstepStats,
  VehicleStats,
} from "@/lib/data/logistics-report";
import {
  matchesDateRange,
  matchesTextSearch,
  type LogisticsReportFilters,
} from "@/lib/reports/report-filters";

export type LogisticsDeliveryRow = {
  id: string;
  driverId: string | null;
  driverName: string;
  vehicleId: string | null;
  vehicleDescription: string;
  vehiclePlate: string;
  createdAt: Date;
  transporteConcluido: boolean;
  levarPerfilEstrutural: boolean;
  levarPerfilTotal: boolean;
  levarAcessorios: boolean;
  levarVidros: boolean;
};

export type LogisticsReportPayload = {
  deliveries: LogisticsDeliveryRow[];
  vehicles: VehicleStats[];
  pendingTransport: number;
};

function filterDeliveries(
  deliveries: LogisticsDeliveryRow[],
  filters: LogisticsReportFilters,
): LogisticsDeliveryRow[] {
  return deliveries.filter((d) => {
    if (
      !matchesDateRange(d.createdAt, filters.dateFrom, filters.dateTo)
    ) {
      return false;
    }
    if (!filters.search.trim()) return true;
    return matchesTextSearch(
      [d.driverName, d.vehicleDescription, d.vehiclePlate],
      filters.search,
    );
  });
}

export function computeLogisticsReport(
  payload: LogisticsReportPayload,
  filters: LogisticsReportFilters = {
    search: "",
    dateFrom: "",
    dateTo: "",
  },
): LogisticsReportData {
  const deliveries = filterDeliveries(payload.deliveries, filters);

  const vehicleMap = new Map<string, VehicleStats>();
  for (const v of payload.vehicles) {
    vehicleMap.set(v.vehicleId, { ...v, totalDeliveries: 0, completedDeliveries: 0 });
  }

  const driverMap = new Map<
    string,
    { name: string; total: number; completed: number; vehicleSet: Set<string> }
  >();

  let perfilDone = 0;
  let acessDone = 0;
  let vidrosDone = 0;
  let totalDone = 0;

  for (const d of deliveries) {
    if (d.levarPerfilEstrutural) perfilDone++;
    if (d.levarAcessorios) acessDone++;
    if (d.levarVidros) vidrosDone++;
    if (d.transporteConcluido) totalDone++;

    if (d.vehicleId) {
      const vs = vehicleMap.get(d.vehicleId);
      if (vs) {
        vs.totalDeliveries++;
        if (d.transporteConcluido) vs.completedDeliveries++;
      }
    }

    if (d.driverId) {
      const entry = driverMap.get(d.driverId) ?? {
        name: d.driverName,
        total: 0,
        completed: 0,
        vehicleSet: new Set<string>(),
      };
      entry.total++;
      if (d.transporteConcluido) entry.completed++;
      if (d.vehicleId) entry.vehicleSet.add(d.vehicleId);
      else if (d.vehiclePlate) entry.vehicleSet.add(d.vehiclePlate);
      driverMap.set(d.driverId, entry);
    }
  }

  const pct = (done: number, total: number) =>
    total === 0 ? 0 : Math.round((done / total) * 100);

  const substepStats: SubstepStats[] = [
    {
      label: "Perfil estrutural",
      done: perfilDone,
      total: deliveries.length,
      pct: pct(perfilDone, deliveries.length),
    },
    {
      label: "Acessórios",
      done: acessDone,
      total: deliveries.length,
      pct: pct(acessDone, deliveries.length),
    },
    {
      label: "Vidros",
      done: vidrosDone,
      total: deliveries.length,
      pct: pct(vidrosDone, deliveries.length),
    },
    {
      label: "Transporte concluído",
      done: totalDone,
      total: deliveries.length,
      pct: pct(totalDone, deliveries.length),
    },
  ];

  const vehicleStats = [...vehicleMap.values()]
    .filter((v) => v.totalDeliveries > 0 || payload.vehicles.some((pv) => pv.vehicleId === v.vehicleId))
    .sort((a, b) => b.totalDeliveries - a.totalDeliveries);

  const drivers: DriverStats[] = [...driverMap.entries()]
    .map(([driverId, d]) => ({
      driverId,
      name: d.name,
      totalDeliveries: d.total,
      completedDeliveries: d.completed,
      vehicles: [...d.vehicleSet]
        .map((vid) => {
          const v = vehicleMap.get(vid);
          return v ? `${v.description} (${v.plate})` : vid;
        })
        .filter(Boolean),
    }))
    .sort((a, b) => b.totalDeliveries - a.totalDeliveries);

  return {
    vehicles: vehicleStats,
    drivers,
    substepStats,
    pendingTransport: payload.pendingTransport,
    generatedAt: new Date().toISOString(),
  };
}

export function reviveLogisticsReportPayload(
  payload: LogisticsReportPayload,
): LogisticsReportPayload {
  return {
    ...payload,
    deliveries: payload.deliveries.map((d) => ({
      ...d,
      createdAt: new Date(d.createdAt),
    })),
  };
}
