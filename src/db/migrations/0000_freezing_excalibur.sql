CREATE TYPE "public"."cutting_status" AS ENUM('pendente', 'em_andamento', 'concluido', 'revisao');--> statement-breakpoint
CREATE TYPE "public"."installation_status" AS ENUM('pendente', 'estrutural', 'vidros', 'final', 'concluido', 'revisao');--> statement-breakpoint
CREATE TYPE "public"."measurement_types" AS ENUM('inicial', 'final');--> statement-breakpoint
CREATE TYPE "public"."os_priority" AS ENUM('baixa', 'normal', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."os_status" AS ENUM('medicao_inicial', 'medicao_final', 'orcamento_enviado', 'aprovado_cliente', 'os_gerada', 'em_corte', 'corte_concluido', 'em_transporte', 'transporte_entregue', 'instalacao_estrutural', 'instalacao_vidros', 'instalacao_final', 'concluido', 'revisao');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado');--> statement-breakpoint
CREATE TYPE "public"."transport_status" AS ENUM('pendente', 'carregado', 'em_transito', 'entregue', 'revisao');--> statement-breakpoint
CREATE TYPE "public"."user_roles" AS ENUM('admin', 'gerente', 'medidor', 'cortador', 'motorista', 'instalador');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"address" text,
	"city" varchar(120),
	"state" varchar(2),
	"zip_code" varchar(12),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cutting_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"cuts" jsonb,
	"packaging" jsonb,
	"accessories" jsonb,
	"notes" text,
	"operator_id" uuid,
	"status" "cutting_status" DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "installation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"structural_installed" boolean DEFAULT false NOT NULL,
	"glass_installed" boolean DEFAULT false NOT NULL,
	"final_completed" boolean DEFAULT false NOT NULL,
	"photos" jsonb,
	"signature_url" text,
	"signed_at" timestamp with time zone,
	"signed_by_name" varchar(255),
	"notes" text,
	"installer_id" uuid,
	"status" "installation_status" DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"type" "measurement_types" NOT NULL,
	"dimensions" jsonb,
	"photos" jsonb,
	"notes" text,
	"client_device_id" varchar(64),
	"synced_at" timestamp with time zone,
	"technician_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"status" "quote_status" DEFAULT 'rascunho' NOT NULL,
	"items" jsonb,
	"margin_percent" numeric(5, 2),
	"subtotal" numeric(12, 2),
	"total" numeric(12, 2),
	"public_token" varchar(64),
	"sent_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by_client_name" varchar(255),
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(32) NOT NULL,
	"client_id" uuid NOT NULL,
	"assigned_user_id" uuid,
	"status" "os_status" DEFAULT 'medicao_inicial' NOT NULL,
	"priority" "os_priority" DEFAULT 'normal' NOT NULL,
	"scheduled_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"description" text,
	"revision_reason" text,
	"revision_from_status" "os_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "stage_sla_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "os_status" NOT NULL,
	"max_hours" integer NOT NULL,
	"notify_roles" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_sla_config_status_unique" UNIQUE("status")
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"from_status" "os_status" NOT NULL,
	"to_status" "os_status" NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"changed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"items_checked" jsonb,
	"load_photos" jsonb,
	"delivery_photos" jsonb,
	"delivery_proof_url" text,
	"notes" text,
	"driver_id" uuid,
	"vehicle_plate" varchar(20),
	"route_notes" text,
	"status" "transport_status" DEFAULT 'pendente' NOT NULL,
	"departure_at" timestamp with time zone,
	"arrival_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"role" "user_roles" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cutting_plans" ADD CONSTRAINT "cutting_plans_os_id_service_orders_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_plans" ADD CONSTRAINT "cutting_plans_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installation_logs" ADD CONSTRAINT "installation_logs_os_id_service_orders_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installation_logs" ADD CONSTRAINT "installation_logs_installer_id_users_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_os_id_service_orders_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_os_id_service_orders_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_os_id_service_orders_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_os_id_service_orders_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clients_name" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_clients_phone" ON "clients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_cut_os" ON "cutting_plans" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_cut_status" ON "cutting_plans" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cut_os_unique" ON "cutting_plans" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_inst_os" ON "installation_logs" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_inst_status" ON "installation_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_inst_installer" ON "installation_logs" USING btree ("installer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inst_os_unique" ON "installation_logs" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_meas_os" ON "measurements" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_meas_type" ON "measurements" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_meas_os_type" ON "measurements" USING btree ("os_id","type");--> statement-breakpoint
CREATE INDEX "idx_meas_technician" ON "measurements" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_os" ON "quotes" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_status" ON "quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quotes_public_token" ON "quotes" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "idx_os_status" ON "service_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_os_client" ON "service_orders" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_os_assigned" ON "service_orders" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "idx_os_scheduled" ON "service_orders" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_os_priority_status" ON "service_orders" USING btree ("priority","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_os_number" ON "service_orders" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sla_status" ON "stage_sla_config" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_status_history_os" ON "status_history" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_status_history_created" ON "status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_status_history_os_created" ON "status_history" USING btree ("os_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_trans_os" ON "transport_logs" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_trans_status" ON "transport_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trans_driver" ON "transport_logs" USING btree ("driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_trans_os_unique" ON "transport_logs" USING btree ("os_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("active");