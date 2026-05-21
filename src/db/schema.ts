import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  pgEnum,
  varchar,
  boolean,
  integer,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type {
  Dimensions,
  CutItem,
  MeasurementLineItem,
  PackagingChecklist,
  InstallationPhotos,
  TransportItemsChecked,
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
  "revisao",
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

export const osPriority = pgEnum("os_priority", [
  "baixa",
  "normal",
  "alta",
  "urgente",
]);

export const measurementTypes = pgEnum("measurement_types", [
  "orcamento",
  "final",
]);

/** Origem das medidas — define o caminho no pipeline antes da OS */
export const measurementFlow = pgEnum("measurement_flow", [
  "cliente_informou",
  "profissional_mediu",
]);

export const quoteStatus = pgEnum("quote_status", [
  "rascunho",
  "enviado",
  "aprovado",
  "rejeitado",
  "expirado",
]);

export const cuttingStatus = pgEnum("cutting_status", [
  "pendente",
  "em_andamento",
  "concluido",
  "revisao",
]);

export const transportStatus = pgEnum("transport_status", [
  "pendente",
  "carregado",
  "em_transito",
  "entregue",
  "revisao",
]);

export const installationStatus = pgEnum("installation_status", [
  "pendente",
  "estrutural",
  "vidros",
  "final",
  "concluido",
  "revisao",
]);

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

export const serviceOrders = pgTable(
  "service_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: varchar("number", { length: 32 }).notNull().unique(),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: osStatus("status").default("medicao_final").notNull(),
    measurementFlow: measurementFlow("measurement_flow")
      .default("profissional_mediu")
      .notNull(),
    priority: osPriority("priority").default("normal").notNull(),
    scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    description: text("description"),
    /** Número do orçamento de referência (extraído do PDF ou informado manualmente) */
    budgetReference: varchar("budget_reference", { length: 64 }),
    /** PDF de origem anexado pelo admin ao criar a medição */
    sourcePdfUrl: text("source_pdf_url"),
    /** Motivo ativo quando status = revisao */
    revisionReason: text("revision_reason"),
    revisionFromStatus: osStatus("revision_from_status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_os_status").on(t.status),
    index("idx_os_assigned").on(t.assignedUserId),
    index("idx_os_scheduled").on(t.scheduledDate),
    index("idx_os_updated_at").on(t.updatedAt),
    index("idx_os_status_updated").on(t.status, t.updatedAt),
    index("idx_os_assigned_status").on(t.assignedUserId, t.status),
    index("idx_os_status_assigned").on(t.status, t.assignedUserId),
    index("idx_os_priority_status").on(t.priority, t.status),
  ],
);

/** Auditoria de transições (inclui ida/volta de revisão) */
export const statusHistory = pgTable(
  "status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    osId: uuid("os_id")
      .references(() => serviceOrders.id, { onDelete: "cascade" })
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
    index("idx_status_history_os").on(t.osId),
    index("idx_status_history_created").on(t.createdAt),
    index("idx_status_history_os_created").on(t.osId, t.createdAt),
    index("idx_status_history_changed_by").on(t.changedById),
  ],
);

// ─── Medição ───────────────────────────────────────────────────────────────────

export const measurements = pgTable(
  "measurements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    osId: uuid("os_id")
      .references(() => serviceOrders.id, { onDelete: "cascade" })
      .notNull(),
    type: measurementTypes("type").notNull(),
    /** Dados do cabeçalho (origem: leitura do PDF do orçamento) */
    cliente: varchar("cliente", { length: 255 }),
    telefone: varchar("telefone", { length: 20 }),
    numeroOrcamento: varchar("numero_orcamento", { length: 64 }),
    dimensions: jsonb("dimensions").$type<Dimensions>(),
    /** Itens de medição (desenho + qty/largura/altura por peça) */
    items: jsonb("items").$type<MeasurementLineItem[]>(),
    photos: jsonb("photos").$type<string[]>(),
    notes: text("notes"),
    /** Sync offline: id local do dispositivo antes do merge */
    clientDeviceId: varchar("client_device_id", { length: 64 }),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    technicianId: uuid("technician_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_meas_os").on(t.osId),
    index("idx_meas_type").on(t.type),
    uniqueIndex("idx_meas_os_type").on(t.osId, t.type),
    index("idx_meas_technician").on(t.technicianId),
  ],
);

// ─── Orçamento ─────────────────────────────────────────────────────────────────

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    osId: uuid("os_id")
      .references(() => serviceOrders.id, { onDelete: "cascade" })
      .notNull(),
    status: quoteStatus("status").default("rascunho").notNull(),
    items: jsonb("items").$type<
      Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        materialCost?: number;
      }>
    >(),
    marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
    total: numeric("total", { precision: 12, scale: 2 }),
    publicToken: varchar("public_token", { length: 64 }).unique(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByClientName: varchar("approved_by_client_name", { length: 255 }),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_quotes_os").on(t.osId),
    index("idx_quotes_status").on(t.status),
    index("idx_quotes_public_token").on(t.publicToken),
    index("idx_quotes_created_by").on(t.createdById),
  ],
);

// ─── Produção (corte) ──────────────────────────────────────────────────────────

export const cuttingPlans = pgTable(
  "cutting_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    osId: uuid("os_id")
      .references(() => serviceOrders.id, { onDelete: "cascade" })
      .notNull(),
    cuts: jsonb("cuts").$type<CutItem[]>(),
    packaging: jsonb("packaging").$type<PackagingChecklist>(),
    accessories: jsonb("accessories").$type<Record<string, number>>(),
    notes: text("notes"),
    operatorId: uuid("operator_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: cuttingStatus("status").default("pendente").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_cut_os").on(t.osId),
    index("idx_cut_status").on(t.status),
    index("idx_cut_operator").on(t.operatorId),
    uniqueIndex("idx_cut_os_unique").on(t.osId),
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
    osId: uuid("os_id")
      .references(() => serviceOrders.id, { onDelete: "cascade" })
      .notNull(),
    itemsChecked: jsonb("items_checked").$type<TransportItemsChecked>(),
    loadPhotos: jsonb("load_photos").$type<string[]>(),
    deliveryPhotos: jsonb("delivery_photos").$type<string[]>(),
    deliveryProofUrl: text("delivery_proof_url"),
    notes: text("notes"),
    driverId: uuid("driver_id").references(() => users.id, {
      onDelete: "set null",
    }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    vehiclePlate: varchar("vehicle_plate", { length: 20 }),
    routeNotes: text("route_notes"),
    status: transportStatus("status").default("pendente").notNull(),
    departureAt: timestamp("departure_at", { withTimezone: true }),
    arrivalAt: timestamp("arrival_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_trans_os").on(t.osId),
    index("idx_trans_status").on(t.status),
    index("idx_trans_driver").on(t.driverId),
    index("idx_trans_vehicle").on(t.vehicleId),
    uniqueIndex("idx_trans_os_unique").on(t.osId),
  ],
);

// ─── Instalação ────────────────────────────────────────────────────────────────

export const installationLogs = pgTable(
  "installation_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    osId: uuid("os_id")
      .references(() => serviceOrders.id, { onDelete: "cascade" })
      .notNull(),
    structuralInstalled: boolean("structural_installed").default(false).notNull(),
    glassInstalled: boolean("glass_installed").default(false).notNull(),
    finalCompleted: boolean("final_completed").default(false).notNull(),
    photos: jsonb("photos").$type<InstallationPhotos>(),
    signatureUrl: text("signature_url"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signedByName: varchar("signed_by_name", { length: 255 }),
    notes: text("notes"),
    installerId: uuid("installer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: installationStatus("status").default("pendente").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_inst_os").on(t.osId),
    index("idx_inst_status").on(t.status),
    index("idx_inst_installer").on(t.installerId),
    uniqueIndex("idx_inst_os_unique").on(t.osId),
  ],
);

// ─── KPIs / alertas de prazo (Fase 3) ─────────────────────────────────────────

export const stageSlaConfig = pgTable(
  "stage_sla_config",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: osStatus("status").notNull().unique(),
    maxHours: integer("max_hours").notNull(),
    notifyRoles: jsonb("notify_roles").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("idx_sla_status").on(t.status)],
);

export const userPasskeys = pgTable(
  "user_passkeys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    credentialId: text("credential_id").notNull().unique(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").default(0).notNull(),
    transports: jsonb("transports").$type<string[]>(),
    deviceName: varchar("device_name", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_passkeys_user").on(t.userId),
  ],
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  assignedOrders: many(serviceOrders),
  measurements: many(measurements),
  quotesCreated: many(quotes),
  cuttingPlans: many(cuttingPlans),
  transportLogs: many(transportLogs),
  installationLogs: many(installationLogs),
  statusChanges: many(statusHistory),
  passkeys: many(userPasskeys),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  transportLogs: many(transportLogs),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [serviceOrders.assignedUserId],
    references: [users.id],
  }),
  measurements: many(measurements),
  quotes: many(quotes),
  cuttingPlan: one(cuttingPlans),
  transportLog: one(transportLogs),
  installationLog: one(installationLogs),
  statusHistory: many(statusHistory),
}));

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [statusHistory.osId],
    references: [serviceOrders.id],
  }),
  changedBy: one(users, {
    fields: [statusHistory.changedById],
    references: [users.id],
  }),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [measurements.osId],
    references: [serviceOrders.id],
  }),
  technician: one(users, {
    fields: [measurements.technicianId],
    references: [users.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [quotes.osId],
    references: [serviceOrders.id],
  }),
  createdBy: one(users, {
    fields: [quotes.createdById],
    references: [users.id],
  }),
}));

export const cuttingPlansRelations = relations(cuttingPlans, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [cuttingPlans.osId],
    references: [serviceOrders.id],
  }),
  operator: one(users, {
    fields: [cuttingPlans.operatorId],
    references: [users.id],
  }),
}));

export const transportLogsRelations = relations(transportLogs, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [transportLogs.osId],
    references: [serviceOrders.id],
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
  serviceOrder: one(serviceOrders, {
    fields: [installationLogs.osId],
    references: [serviceOrders.id],
  }),
  installer: one(users, {
    fields: [installationLogs.installerId],
    references: [users.id],
  }),
}));

export const userPasskeysRelations = relations(userPasskeys, ({ one }) => ({
  user: one(users, {
    fields: [userPasskeys.userId],
    references: [users.id],
  }),
}));

// ─── Type exports ──────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type OsStatus = (typeof osStatus.enumValues)[number];
export type MeasurementFlow = (typeof measurementFlow.enumValues)[number];
