import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { getDirectDatabaseUrl } from "./env";
import * as schema from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_DEFAULT_PASSWORD } from "@/lib/auth/demo-password";
import { FINAL_MEASUREMENT_TYPE } from "@/lib/workflow/measurement-actions";

const connectionString = getDirectDatabaseUrl();
const client = postgres(connectionString, {
  prepare: false,
  ssl: connectionString.includes("supabase") ? "require" : undefined,
  max: 1,
});
const db = drizzle(client, { schema });

async function main() {
  console.log("🌱 Seeding Supabase...");

  await db.execute(sql`
    TRUNCATE TABLE
      status_history,
      measurements,
      quotes,
      cutting_plans,
      transport_logs,
      installation_logs,
      user_passkeys,
      vehicles,
      service_orders,
      users,
      stage_sla_config
    RESTART IDENTITY CASCADE;
  `);

  const passwordHash = await hashPassword(DEMO_DEFAULT_PASSWORD);

  const users = await db
    .insert(schema.users)
    .values([
      {
        name: "Admin Geral",
        email: "admin@vidracaria.com",
        roles: ["admin"],
        passwordHash,
      },
      {
        name: "João Medidor",
        email: "joao@vidracaria.com",
        roles: ["medidor"],
        passwordHash,
      },
      {
        name: "Maria Corte",
        email: "maria@vidracaria.com",
        roles: ["cortador"],
        passwordHash,
      },
      {
        name: "Carlos Transport",
        email: "carlos@vidracaria.com",
        roles: ["motorista", "instalador"],
        passwordHash,
      },
      {
        name: "Pedro Instala",
        email: "pedro@vidracaria.com",
        roles: ["instalador"],
        passwordHash,
      },
    ])
    .returning();

  const [admin, medidor, cortador, motorista, instalador] = users;

  const [osMedicao, osCorte, osTransporte, osInstalacao, osPool] = await db
    .insert(schema.serviceOrders)
    .values([
      {
        number: "OS-2026-SEED01",
        assignedUserId: medidor.id,
        status: "medicao_orcamento",
        priority: "alta",
        description: "Porta de vidro temperado 10mm + esquadria alumínio",
        budgetReference: "ORC-2026-SEED01",
      },
      {
        number: "OS-2026-SEED02",
        assignedUserId: cortador.id,
        status: "cortes",
        priority: "normal",
        description: "Fachada comercial — perfil estruturado",
        budgetReference: "ORC-2026-SEED02",
      },
      {
        number: "OS-2026-SEED03",
        assignedUserId: motorista.id,
        status: "transporte_perfil",
        priority: "urgente",
        description: "Entrega esquadrias — bloco B",
        budgetReference: "ORC-2026-SEED03",
      },
      {
        number: "OS-2026-SEED04",
        assignedUserId: instalador.id,
        status: "instalacao_estrutural",
        priority: "normal",
        description: "Instalação estrutural sacada",
        budgetReference: "ORC-2026-SEED04",
      },
      {
        number: "OS-2026-SEED05",
        assignedUserId: null,
        status: "medicao_final",
        priority: "baixa",
        description: "Guarda-corpo varanda — pool sem técnico",
        budgetReference: "ORC-2026-SEED05",
      },
    ])
    .returning();

  await db.insert(schema.measurements).values([
    {
      osId: osMedicao.id,
      type: FINAL_MEASUREMENT_TYPE,
      cliente: "Construtora Horizonte",
      telefone: "(11) 99999-8888",
      numeroOrcamento: "ORC-2026-SEED01",
      dimensions: { largura: 900, altura: 2100, espessura: 10 },
      technicianId: medidor.id,
      notes: "Local plano, sem obstáculos aparentes",
    },
    {
      osId: osCorte.id,
      type: FINAL_MEASUREMENT_TYPE,
      cliente: "Comercial Vidro & Cia",
      telefone: "(11) 91234-5678",
      numeroOrcamento: "ORC-2026-SEED02",
    },
    {
      osId: osTransporte.id,
      type: FINAL_MEASUREMENT_TYPE,
      cliente: "Condomínio Horizonte",
      telefone: "(11) 99876-5432",
      numeroOrcamento: "ORC-2026-SEED03",
    },
    {
      osId: osInstalacao.id,
      type: FINAL_MEASUREMENT_TYPE,
      cliente: "Construtora Horizonte",
      telefone: "(11) 99999-8888",
      numeroOrcamento: "ORC-2026-SEED04",
    },
    {
      osId: osPool.id,
      type: FINAL_MEASUREMENT_TYPE,
      cliente: "Residencial Solar",
      telefone: "(11) 98765-4321",
      numeroOrcamento: "ORC-2026-SEED05",
    },
  ]);

  await db.insert(schema.vehicles).values([
    {
      description: "Fiorino — carga leve",
      plate: "ABC1D23",
    },
    {
      description: "Sprinter — esquadrias",
      plate: "XYZ9E87",
    },
  ]);

  console.log("✅ Seed completed:", {
    orders: [
      osMedicao.number,
      osCorte.number,
      osTransporte.number,
      osInstalacao.number,
      osPool.number,
    ].join(", "),
    demoPassword: DEMO_DEFAULT_PASSWORD,
  });
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
