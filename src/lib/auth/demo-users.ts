import type { UserRole } from "@/db/schema";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
};

/** IDs fixos para modo demo (sem banco) — alinhados ao seed quando possível. */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    name: "Admin Geral",
    email: "admin@vidracaria.com",
    roles: ["admin"],
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    name: "João Medidor",
    email: "joao@vidracaria.com",
    roles: ["medidor"],
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    name: "Maria Corte",
    email: "maria@vidracaria.com",
    roles: ["cortador"],
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    name: "Carlos Transport",
    email: "carlos@vidracaria.com",
    roles: ["motorista", "instalador"],
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    name: "Pedro Instala",
    email: "pedro@vidracaria.com",
    roles: ["instalador"],
  },
];

export function getDemoUser(userId: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.id === userId);
}

export function getDemoUserByEmail(email: string): DemoUser | undefined {
  const normalized = email.trim().toLowerCase();
  return DEMO_USERS.find((u) => u.email.toLowerCase() === normalized);
}
