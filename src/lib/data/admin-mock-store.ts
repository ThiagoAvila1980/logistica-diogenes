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

/** OS em transporte com vehicleId atribuído (mock). */
const mockVehicleInUse = new Map<string, string>();

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase();
}

function refreshInUseFlags() {
  mockVehicles = mockVehicles.map((v) => ({
    ...v,
    inUse: [...mockVehicleInUse.values()].includes(v.id),
  }));
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

  assignToTransport(osId: string, vehicleId: string | null) {
    if (vehicleId) {
      for (const [os, vid] of mockVehicleInUse.entries()) {
        if (vid === vehicleId && os !== osId) {
          throw new Error("Veículo já em uso em outra OS");
        }
      }
      mockVehicleInUse.set(osId, vehicleId);
    } else {
      mockVehicleInUse.delete(osId);
    }
    refreshInUseFlags();
  },

  releaseFromTransport(osId: string) {
    mockVehicleInUse.delete(osId);
    refreshInUseFlags();
  },

  getPlate(vehicleId: string | null | undefined): string | null {
    if (!vehicleId) return null;
    return this.getById(vehicleId)?.plate ?? null;
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
};
