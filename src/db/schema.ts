import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  pgEnum,
  varchar,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type {
  Dimensions,
  MeasurementLineItem,
  InstallationPhotos,
} from "@/lib/workflow/schemas";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoles = pgEnum("user_roles", [
  "admin",
  "gerente",
  "medidor",
  "cortador",
  "motorista",
  "instalador",
]);

export type UserRole = (typeof userRoles.enumValues)[number];

/** Pipeline principal da OS (máquina de estados) */
export const osStatus = pgEnum("os_status", [
  // MEDIÇÃO
  "medicao_orcamento",
  "medicao_final",
  // PLANO DE CORTE
  "cortes",
  "embalagem",
  "acessorios_plano",
  // TRANSPORTE
  "transporte_perfil",
  "transporte_estrutural",
  "transporte_perfis_total",
  "transporte_acessorios",
  "transporte_levar_vidro",
  // INSTALAÇÃO
  "instalacao_estrutural",
  "instalacao_vidros",
  "concluido",
  // Legado (registros antigos / histórico)
  "orcamento_enviado",
  "aprovado_cliente",
  "os_gerada",
  "em_corte",
  "corte_concluido",
  "em_transporte",
  "transporte_entregue",
  "instalacao_final",
]);

export const measurementTypes = pgEnum("measurement_types", [
  "orcamento",
  "final",
]);

export const measurementStatus = pgEnum("measurement_status", [
  "pendente",
  "medida",
]);

export const measurementPriority = pgEnum("measurement_priority", [
  "normal",
  "alta",
  "urgente",
]);

// ─── Lookup tables ─────────────────────────────────────────────────────────────

export const cores = pgTable("cores", {
  idCor: uuid("id_cor").defaultRandom().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
});

export const tipoVidro = pgTable("tipo_vidro", {
  idTipoVidro: uuid("id_tipo_vidro").defaultRandom().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
});

export const tipoEnvidracamento = pgTable("tipo_envidracamento", {
  idTipoEnvidracamento: uuid("id_tipo_envidracamento")
    .defaultRandom()
    .primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
});

export const ambientes = pgTable("ambientes", {
  idAmbiente: uuid("id_ambiente").defaultRandom().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
});

// ─── Core ──────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }),
    roles: userRoles("roles").array().notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_users_roles").on(t.roles),
    index("idx_users_active").on(t.active),
  ],
);

export const measurements = pgTable(
  "measurements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: varchar("number", { length: 32 }).notNull().unique(),
    type: measurementTypes("type").notNull(),
    status: measurementStatus("status").default("pendente").notNull(),
    etapa: osStatus("etapa").default("medicao_final").notNull(),
    priority: measurementPriority("priority").default("normal").notNull(),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    cliente: varchar("cliente", { length: 255 }),
    telefone: varchar("telefone", { length: 20 }),
    numeroOrcamento: varchar("numero_orcamento", { length: 64 }),
    budgetReference: varchar("budget_reference", { length: 64 }),
    sourcePdfUrl: text("source_pdf_url"),
    description: text("description"),
    scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
    dimensions: jsonb("dimensions").$type<Dimensions>(),
    items: jsonb("items").$type<MeasurementLineItem[]>(),
    photos: jsonb("photos").$type<string[]>(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_meas_type").on(t.type),
    index("idx_meas_status").on(t.status),
    index("idx_meas_etapa").on(t.etapa),
    index("idx_meas_priority").on(t.priority),
    index("idx_meas_assigned").on(t.assignedUserId),
    index("idx_meas_etapa_updated").on(t.etapa, t.updatedAt),
  ],
);

/** Auditoria de transições de etapa */
export const statusHistory = pgTable(
  "status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    measurementId: uuid("measurement_id")
      .references(() => measurements.id, { onDelete: "cascade" })
      .notNull(),
    fromStatus: osStatus("from_status").notNull(),
    toStatus: osStatus("to_status").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    changedById: uuid("changed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_status_history_measurement").on(t.measurementId),
    index("idx_status_history_created").on(t.createdAt),
    index("idx_status_history_measurement_created").on(
      t.measurementId,
      t.createdAt,
    ),
    index("idx_status_history_changed_by").on(t.changedById),
  ],
);

// ─── Produção (corte) ──────────────────────────────────────────────────────────

export const cuttingPlans = pgTable(
  "cutting_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idMedicao: uuid("id_medicao")
      .references(() => measurements.id, { onDelete: "cascade" })
      .notNull(),
    corteFeito: boolean("corte_feito").default(false).notNull(),
    embalagemFeita: boolean("embalagem_feita").default(false).notNull(),
    acessoriosFeitos: boolean("acessorios_feitos").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_cut_medicao").on(t.idMedicao),
    uniqueIndex("idx_cut_medicao_unique").on(t.idMedicao),
  ],
);

// ─── Veículos ──────────────────────────────────────────────────────────────────

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    description: varchar("description", { length: 255 }).notNull(),
    plate: varchar("plate", { length: 20 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("idx_vehicles_plate").on(t.plate),
    index("idx_vehicles_active").on(t.active),
  ],
);

// ─── Logística ─────────────────────────────────────────────────────────────────

export const transportLogs = pgTable(
  "transport_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idMedicao: uuid("id_medicao")
      .references(() => measurements.id, { onDelete: "cascade" })
      .notNull(),
    driverId: uuid("driver_id").references(() => users.id, {
      onDelete: "set null",
    }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    vehiclePlate: varchar("vehicle_plate", { length: 20 }),
    routeNotes: text("route_notes"),
    // Sub-etapas independentes — desbloqueadas pelos cutting steps correspondentes
    levarPerfilEstrutural: boolean("levar_perfil_estrutural").default(false).notNull(),
    levarPerfilTotal: boolean("levar_perfis_total").default(false).notNull(),
    levarAcessorios: boolean("levar_acessorios").default(false).notNull(),
    transporteConcluido: boolean("transporte_concluido").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_trans_medicao").on(t.idMedicao),
    index("idx_trans_driver").on(t.driverId),
    index("idx_trans_vehicle").on(t.vehicleId),
    uniqueIndex("idx_trans_medicao_unique").on(t.idMedicao),
  ],
);

// ─── Instalação ────────────────────────────────────────────────────────────────

export const installationLogs = pgTable(
  "installation_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idMedicao: uuid("id_medicao")
      .references(() => measurements.id, { onDelete: "cascade" })
      .notNull(),
    // Sub-etapas independentes — desbloqueadas pelos transport steps correspondentes
    instalacaoEstruturalFeita: boolean("instalacao_estrutural_feita").default(false).notNull(),
    instalacaoVidrosFeita: boolean("instalacao_vidros_feita").default(false).notNull(),
    photos: jsonb("photos").$type<InstallationPhotos>(),
    notes: text("notes"),
    installerId: uuid("installer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_inst_medicao").on(t.idMedicao),
    index("idx_inst_installer").on(t.installerId),
    uniqueIndex("idx_inst_medicao_unique").on(t.idMedicao),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    href: text("href"),
    measurementId: uuid("measurement_id").references(() => measurements.id, {
      onDelete: "set null",
    }),
    cuttingPlanId: uuid("cutting_plan_id").references(() => cuttingPlans.id, {
      onDelete: "set null",
    }),
    transportLogId: uuid("transport_log_id").references(
      () => transportLogs.id,
      { onDelete: "set null" },
    ),
    installationLogId: uuid("installation_log_id").references(
      () => installationLogs.id,
      { onDelete: "set null" },
    ),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_notifications_user_created").on(t.userId, t.createdAt),
  ],
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  assignedMeasurements: many(measurements, { relationName: "assignedMeasurements" }),
  cuttingPlans: many(cuttingPlans),
  transportLogs: many(transportLogs),
  installationLogs: many(installationLogs),
  statusChanges: many(statusHistory),
  notifications: many(notifications),
}));

export const coresRelations = relations(cores, () => ({}));

export const tipoVidroRelations = relations(tipoVidro, () => ({}));

export const tipoEnvidracamentoRelations = relations(
  tipoEnvidracamento,
  () => ({}),
);

export const ambientesRelations = relations(ambientes, () => ({}));

export const measurementsRelations = relations(measurements, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [measurements.assignedUserId],
    references: [users.id],
    relationName: "assignedMeasurements",
  }),
  cuttingPlan: one(cuttingPlans),
  transportLog: one(transportLogs),
  installationLog: one(installationLogs),
  statusHistory: many(statusHistory),
}));

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  measurement: one(measurements, {
    fields: [statusHistory.measurementId],
    references: [measurements.id],
  }),
  changedBy: one(users, {
    fields: [statusHistory.changedById],
    references: [users.id],
  }),
}));

export const cuttingPlansRelations = relations(cuttingPlans, ({ one }) => ({
  measurement: one(measurements, {
    fields: [cuttingPlans.idMedicao],
    references: [measurements.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  transportLogs: many(transportLogs),
}));

export const transportLogsRelations = relations(transportLogs, ({ one }) => ({
  measurement: one(measurements, {
    fields: [transportLogs.idMedicao],
    references: [measurements.id],
  }),
  driver: one(users, {
    fields: [transportLogs.driverId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [transportLogs.vehicleId],
    references: [vehicles.id],
  }),
}));

export const installationLogsRelations = relations(installationLogs, ({ one }) => ({
  measurement: one(measurements, {
    fields: [installationLogs.idMedicao],
    references: [measurements.id],
  }),
  installer: one(users, {
    fields: [installationLogs.installerId],
    references: [users.id],
  }),
}));

// ─── Type exports ──────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
export type OsStatus = (typeof osStatus.enumValues)[number];
export type MeasurementDbStatus = (typeof measurementStatus.enumValues)[number];
export type MeasurementPriority = (typeof measurementPriority.enumValues)[number];
export type MeasurementDbType = (typeof measurementTypes.enumValues)[number];

/** @deprecated Use Measurement — alias mantido durante migração do código */
export type ServiceOrder = Measurement;
