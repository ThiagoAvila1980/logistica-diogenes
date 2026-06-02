import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { getDirectDatabaseUrl, isRemoteSupabaseUrl } from "./env";
import * as schema from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_DEFAULT_PASSWORD } from "@/lib/auth/demo-password";

const connectionString = getDirectDatabaseUrl();
const client = postgres(connectionString, {
  prepare: false,
  ssl: isRemoteSupabaseUrl(connectionString) ? "require" : undefined,
  max: 1,
});
const db = drizzle(client, { schema });

async function main() {
  console.log("🌱 Seeding Supabase...");

  await db.execute(sql`
    TRUNCATE TABLE
      notifications,
      status_history,
      cutting_plans,
      transport_logs,
      installation_logs,
      measurements,
      vehicles,
      users
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

  const [medMedicao, medCorte, medTransporte, medInstalacao, medPool] =
    await db
      .insert(schema.measurements)
      .values([
        {
          number: "OS-2026-SEED01",
          type: "orcamento",
          status: "medida",
          etapa: "medicao_orcamento",
          priority: "alta",
          assignedUserId: medidor.id,
          cliente: "Construtora Horizonte",
          telefone: "(11) 99999-8888",
          numeroOrcamento: "ORC-2026-SEED01",
          budgetReference: "ORC-2026-SEED01",
          description: "Porta de vidro temperado 10mm + esquadria alumínio",
          dimensions: { largura: 900, altura: 2100, espessura: 10 },
          notes: "Local plano, sem obstáculos aparentes",
        },
        {
          number: "OS-2026-SEED02",
          type: "final",
          status: "medida",
          etapa: "cortes",
          priority: "normal",
          assignedUserId: cortador.id,
          cliente: "Comercial Vidro & Cia",
          telefone: "(11) 91234-5678",
          numeroOrcamento: "ORC-2026-SEED02",
          budgetReference: "ORC-2026-SEED02",
          description: "Fachada comercial — perfil estruturado",
        },
        {
          number: "OS-2026-SEED03",
          type: "final",
          status: "medida",
          etapa: "transporte_perfil",
          priority: "urgente",
          assignedUserId: motorista.id,
          cliente: "Condomínio Horizonte",
          telefone: "(11) 99876-5432",
          numeroOrcamento: "ORC-2026-SEED03",
          budgetReference: "ORC-2026-SEED03",
          description: "Entrega esquadrias — bloco B",
        },
        {
          number: "OS-2026-SEED04",
          type: "final",
          status: "medida",
          etapa: "instalacao_estrutural",
          priority: "normal",
          assignedUserId: instalador.id,
          cliente: "Construtora Horizonte",
          telefone: "(11) 99999-8888",
          numeroOrcamento: "ORC-2026-SEED04",
          budgetReference: "ORC-2026-SEED04",
          description: "Instalação estrutural sacada",
        },
        {
          number: "OS-2026-SEED05",
          type: "final",
          status: "pendente",
          etapa: "medicao_final",
          priority: "normal",
          assignedUserId: null,
          cliente: "Residencial Solar",
          telefone: "(11) 98765-4321",
          numeroOrcamento: "ORC-2026-SEED05",
          budgetReference: "ORC-2026-SEED05",
          description: "Guarda-corpo varanda — pool sem técnico",
        },
      ])
      .returning();

  await db.insert(schema.cuttingPlans).values([
    {
      idMedicao: medCorte.id,
      corteFeito: true,
      embalagemFeita: false,
      acessoriosFeitos: false,
      vidrosFeitos: false,
    },
  ]);

  const vehicles = await db
    .insert(schema.vehicles)
    .values([
      {
        description: "Fiorino — carga leve",
        plate: "ABC1D23",
      },
      {
        description: "Sprinter — esquadrias",
        plate: "XYZ9E87",
      },
    ])
    .returning();

  await db.insert(schema.transportLogs).values([
    {
      idMedicao: medTransporte.id,
      driverId: motorista.id,
      vehicleId: vehicles[0].id,
      vehiclePlate: vehicles[0].plate,
    },
  ]);

  await db.insert(schema.installationLogs).values([
    {
      idMedicao: medInstalacao.id,
      installerId: instalador.id,
    },
  ]);

  console.log("✅ Seed completed:", {
    measurements: [
      medMedicao.number,
      medCorte.number,
      medTransporte.number,
      medInstalacao.number,
      medPool.number,
    ].join(", "),
    demoPassword: DEMO_DEFAULT_PASSWORD,
    adminEmail: admin.email,
  });
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
