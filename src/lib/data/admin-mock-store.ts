import type { User } from "@/db/schema";

export type VehicleRow = {
  id: string;
  description: string;
  plate: string;
  active: boolean;
  inUse: boolean;
};

type MockVehicle = VehicleRow;

let mockVehicles: MockVehicle[] = [
  {
    id: "b1000000-0000-4000-8000-000000000001",
    description: "Fiorino — carga leve",
    plate: "ABC1D23",
    active: true,
    inUse: false,
  },
  {
    id: "b1000000-0000-4000-8000-000000000002",
    description: "Sprinter — esquadrias",
    plate: "XYZ9E87",
    active: true,
    inUse: false,
  },
];

/** Vão em transporte com vehicleId atribuído (mock). Chave: `${osId}:${itemId}` */
const mockVehicleInUse = new Map<string, string>();

function vaoKey(osId: string, itemId: string): string {
  return `${osId}:${itemId}`;
}

function refreshInUseFlags() {
  const inUseIds = new Set(mockVehicleInUse.values());
  mockVehicles = mockVehicles.map((v) => ({
    ...v,
    inUse: inUseIds.has(v.id),
  }));
}

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase();
}

function isVehicleUsedOnOtherOs(osId: string, vehicleId: string): boolean {
  for (const [key, assignedVehicleId] of mockVehicleInUse.entries()) {
    const assignedOsId = key.split(":")[0];
    if (assignedVehicleId === vehicleId && assignedOsId !== osId) {
      return true;
    }
  }
  return false;
}

export const vehicleMockStore = {
  list(): VehicleRow[] {
    refreshInUseFlags();
    return mockVehicles.map((v) => ({ ...v }));
  },

  listActive(): VehicleRow[] {
    return this.list().filter((v) => v.active);
  },

  getById(id: string): VehicleRow | undefined {
    return this.list().find((v) => v.id === id);
  },

  create(data: { description: string; plate: string }): VehicleRow {
    const plate = normalizePlate(data.plate);
    if (mockVehicles.some((v) => v.plate === plate)) {
      throw new Error("Placa já cadastrada");
    }
    const row: VehicleRow = {
      id: crypto.randomUUID(),
      description: data.description.trim(),
      plate,
      active: true,
      inUse: false,
    };
    mockVehicles.push(row);
    return row;
  },

  update(
    id: string,
    data: Partial<{ description: string; plate: string; active: boolean }>,
  ): VehicleRow {
    const idx = mockVehicles.findIndex((v) => v.id === id);
    if (idx < 0) throw new Error("Veículo não encontrado");
    if (data.plate) {
      const plate = normalizePlate(data.plate);
      if (mockVehicles.some((v) => v.plate === plate && v.id !== id)) {
        throw new Error("Placa já cadastrada");
      }
      mockVehicles[idx].plate = plate;
    }
    if (data.description != null) {
      mockVehicles[idx].description = data.description.trim();
    }
    if (data.active != null) {
      if (!data.active && mockVehicles[idx].inUse) {
        throw new Error("Veículo em uso no transporte");
      }
      mockVehicles[idx].active = data.active;
    }
    return { ...mockVehicles[idx] };
  },

  delete(id: string): void {
    const vehicle = mockVehicles.find((v) => v.id === id);
    if (!vehicle) throw new Error("Veículo não encontrado");
    if (vehicle.inUse) throw new Error("Veículo em uso no transporte");
    mockVehicles = mockVehicles.filter((v) => v.id !== id);
  },

  assignToVao(osId: string, itemId: string, vehicleId: string | null) {
    const key = vaoKey(osId, itemId);
    if (vehicleId) {
      mockVehicleInUse.set(key, vehicleId);
    } else {
      mockVehicleInUse.delete(key);
    }
    refreshInUseFlags();
  },

  /** @deprecated Use assignToVao */
  assignToTransport(osId: string, vehicleId: string | null) {
    if (vehicleId) {
      if (isVehicleUsedOnOtherOs(osId, vehicleId)) {
        throw new Error("Veículo já em uso em outra OS");
      }
      mockVehicleInUse.set(`${osId}:__legacy__`, vehicleId);
    } else {
      for (const key of mockVehicleInUse.keys()) {
        if (key.startsWith(`${osId}:`)) mockVehicleInUse.delete(key);
      }
    }
    refreshInUseFlags();
  },

  releaseFromTransport(osId: string) {
    for (const key of mockVehicleInUse.keys()) {
      if (key.startsWith(`${osId}:`)) mockVehicleInUse.delete(key);
    }
    refreshInUseFlags();
  },

  getPlate(vehicleId: string | null | undefined): string | null {
    if (!vehicleId) return null;
    return this.getById(vehicleId)?.plate ?? null;
  },

  isInUseByOtherOs(osId: string, vehicleId: string): boolean {
    return isVehicleUsedOnOtherOs(osId, vehicleId);
  },
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  roles: User["roles"];
  phone: string | null;
  active: boolean;
};

export type LookupMockRow = {
  id: string;
  descricao: string;
};

function normalizeLookupDescricao(descricao: string): string {
  return descricao.trim();
}

function createLookupMockStore(seed: LookupMockRow[]) {
  let items = seed.map((item) => ({ ...item }));

  return {
    list(): LookupMockRow[] {
      return items
        .map((item) => ({ ...item }))
        .sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"));
    },

    create(descricao: string): LookupMockRow {
      const value = normalizeLookupDescricao(descricao);
      if (!value) throw new Error("Descrição obrigatória");
      const normalized = value.toLowerCase();
      if (items.some((item) => item.descricao.toLowerCase() === normalized)) {
        throw new Error("Descrição já cadastrada");
      }
      const row: LookupMockRow = { id: crypto.randomUUID(), descricao: value };
      items.push(row);
      return row;
    },

    update(id: string, descricao: string): LookupMockRow {
      const idx = items.findIndex((item) => item.id === id);
      if (idx < 0) throw new Error("Registro não encontrado");
      const value = normalizeLookupDescricao(descricao);
      if (!value) throw new Error("Descrição obrigatória");
      const normalized = value.toLowerCase();
      if (
        items.some(
          (item) =>
            item.id !== id && item.descricao.toLowerCase() === normalized,
        )
      ) {
        throw new Error("Descrição já cadastrada");
      }
      items[idx].descricao = value;
      return { ...items[idx] };
    },

    delete(id: string): void {
      const idx = items.findIndex((item) => item.id === id);
      if (idx < 0) throw new Error("Registro não encontrado");
      items = items.filter((item) => item.id !== id);
    },
  };
}

export const corMockStore = createLookupMockStore([
  { id: "mock-cor-branco", descricao: "Branco" },
  { id: "mock-cor-preto", descricao: "Preto" },
  { id: "mock-cor-bronze", descricao: "Bronze" },
  { id: "mock-cor-natural", descricao: "Natural" },
]);

export const tipoVidroMockStore = createLookupMockStore([
  { id: "mock-vidro-8", descricao: "Temperado 8mm" },
  { id: "mock-vidro-10", descricao: "Temperado 10mm" },
  { id: "mock-vidro-lam", descricao: "Laminado" },
  { id: "mock-vidro-comum", descricao: "Comum" },
]);

export const tipoEnvidracamentoMockStore = createLookupMockStore([
  { id: "mock-env-correr", descricao: "Correr" },
  { id: "mock-env-abrir", descricao: "Abrir" },
  { id: "mock-env-pivot", descricao: "Pivotante" },
  { id: "mock-env-fixo", descricao: "Fixo" },
]);

const tipoEnvidracamentoImagemById = new Map<string, string | null>();
const tipoEnvidracamentoDificuldadeById = new Map<string, number>();

export const tipoEnvidracamentoAdminMockStore = {
  list() {
    return tipoEnvidracamentoMockStore.list().map((item) => ({
      ...item,
      imagemUrl: tipoEnvidracamentoImagemById.get(item.id) ?? null,
      dificuldade: tipoEnvidracamentoDificuldadeById.get(item.id) ?? 1,
      usageCount: 0,
    }));
  },

  create(descricao: string, imagemUrl: string | null, dificuldade = 1) {
    const row = tipoEnvidracamentoMockStore.create(descricao);
    tipoEnvidracamentoImagemById.set(row.id, imagemUrl);
    tipoEnvidracamentoDificuldadeById.set(row.id, dificuldade);
    return row;
  },

  update(
    id: string,
    descricao: string,
    imagemUrl: string | null,
    dificuldade = 1,
  ) {
    const row = tipoEnvidracamentoMockStore.update(id, descricao);
    tipoEnvidracamentoImagemById.set(id, imagemUrl);
    tipoEnvidracamentoDificuldadeById.set(id, dificuldade);
    return row;
  },

  delete(id: string) {
    tipoEnvidracamentoMockStore.delete(id);
    tipoEnvidracamentoImagemById.delete(id);
    tipoEnvidracamentoDificuldadeById.delete(id);
  },

  getImagemUrl(id: string): string | null {
    return tipoEnvidracamentoImagemById.get(id) ?? null;
  },

  getDificuldade(id: string): number {
    return tipoEnvidracamentoDificuldadeById.get(id) ?? 1;
  },
};

export const ambienteMockStore = createLookupMockStore([
  { id: "mock-amb-sala", descricao: "Sala" },
  { id: "mock-amb-quarto", descricao: "Quarto" },
  { id: "mock-amb-varanda", descricao: "Varanda" },
  { id: "mock-amb-cozinha", descricao: "Cozinha" },
  { id: "mock-amb-banheiro", descricao: "Banheiro" },
  { id: "mock-amb-externa", descricao: "Área externa" },
]);

let mockAdminUsers: AdminUserRow[] = [];

export function initMockAdminUsers(seed: AdminUserRow[]) {
  if (mockAdminUsers.length === 0) {
    mockAdminUsers = seed.map((u) => ({ ...u }));
  }
}

export const userMockStore = {
  list(): AdminUserRow[] {
    return mockAdminUsers.map((u) => ({ ...u }));
  },

  create(data: {
    name: string;
    email: string;
    roles: User["roles"];
    phone?: string | null;
  }): AdminUserRow {
    const email = data.email.trim().toLowerCase();
    if (mockAdminUsers.some((u) => u.email === email)) {
      throw new Error("E-mail já cadastrado");
    }
    const row: AdminUserRow = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      email,
      roles: data.roles,
      phone: data.phone?.trim() ?? null,
      active: true,
    };
    mockAdminUsers.push(row);
    return row;
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      roles: User["roles"];
      phone: string | null;
      active: boolean;
    }>,
  ): AdminUserRow {
    const idx = mockAdminUsers.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error("Usuário não encontrado");
    if (data.email) {
      const email = data.email.trim().toLowerCase();
      if (mockAdminUsers.some((u) => u.email === email && u.id !== id)) {
        throw new Error("E-mail já cadastrado");
      }
      mockAdminUsers[idx].email = email;
    }
    if (data.name != null) mockAdminUsers[idx].name = data.name.trim();
    if (data.roles != null) mockAdminUsers[idx].roles = data.roles;
    if (data.phone !== undefined) mockAdminUsers[idx].phone = data.phone;
    if (data.active != null) mockAdminUsers[idx].active = data.active;
    return { ...mockAdminUsers[idx] };
  },

  delete(id: string): void {
    const idx = mockAdminUsers.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error("Usuário não encontrado");
    mockAdminUsers.splice(idx, 1);
  },

  countAdmins(excludeId?: string): number {
    return mockAdminUsers.filter(
      (u) => u.id !== excludeId && u.roles.includes("admin"),
    ).length;
  },
};
