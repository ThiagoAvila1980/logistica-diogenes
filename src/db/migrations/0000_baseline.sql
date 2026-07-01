CREATE TYPE "public"."measurement_priority" AS ENUM('normal', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."measurement_status" AS ENUM('pendente', 'medida');--> statement-breakpoint
CREATE TYPE "public"."measurement_types" AS ENUM('orcamento', 'final');--> statement-breakpoint
CREATE TYPE "public"."os_status" AS ENUM('medicao_orcamento', 'medicao_final', 'cortes', 'embalagem', 'acessorios_plano', 'transporte_perfil', 'transporte_estrutural', 'transporte_perfis_total', 'transporte_acessorios', 'transporte_levar_vidro', 'instalacao_estrutural', 'instalacao_vidros', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."user_roles" AS ENUM('admin', 'gerente', 'medidor', 'cortador', 'motorista', 'instalador');--> statement-breakpoint
CREATE TYPE "public"."work_event_type" AS ENUM('corte_vao', 'transporte_vao', 'instalacao_vao', 'medicao');--> statement-breakpoint
CREATE TABLE "ambientes" (
	"id_ambiente" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cores" (
	"id_cor" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cutting_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_medicao" uuid NOT NULL,
	"corte_feito" boolean DEFAULT false NOT NULL,
	"embalagem_feita" boolean DEFAULT false NOT NULL,
	"acessorios_feitos" boolean DEFAULT false NOT NULL,
	"vidros_feitos" boolean DEFAULT false NOT NULL,
	"cutter_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_medicao" uuid NOT NULL,
	"instalacao_estrutural_feita" boolean DEFAULT false NOT NULL,
	"instalacao_vidros_feita" boolean DEFAULT false NOT NULL,
	"instalacao_acabamento_feito" boolean DEFAULT false NOT NULL,
	"photos" jsonb,
	"daily_notes" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(32) NOT NULL,
	"type" "measurement_types" NOT NULL,
	"status" "measurement_status" DEFAULT 'pendente' NOT NULL,
	"etapa" "os_status" DEFAULT 'medicao_final' NOT NULL,
	"priority" "measurement_priority" DEFAULT 'normal' NOT NULL,
	"assigned_user_id" uuid,
	"cliente" varchar(255),
	"telefone" varchar(20),
	"endereco" text,
	"numero_orcamento" varchar(64),
	"budget_reference" varchar(64),
	"source_pdf_url" text,
	"description" text,
	"scheduled_date" timestamp with time zone,
	"dimensions" jsonb,
	"items" jsonb,
	"photos" jsonb,
	"notes" text,
	"client_updated_at" timestamp with time zone,
	"device_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "measurements_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"measurement_id" uuid,
	"cutting_plan_id" uuid,
	"transport_log_id" uuid,
	"installation_log_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_screen_access" (
	"role" "user_roles" NOT NULL,
	"screen" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_screen_access_role_screen_pk" PRIMARY KEY("role","screen")
);
--> statement-breakpoint
CREATE TABLE "scoring_rules" (
	"event_type" "work_event_type" PRIMARY KEY NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_id" uuid NOT NULL,
	"from_status" "os_status" NOT NULL,
	"to_status" "os_status" NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"changed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipo_envidracamento" (
	"id_tipo_envidracamento" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" varchar(255) NOT NULL,
	"imagem_url" varchar(2048),
	"dificuldade" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipo_vidro" (
	"id_tipo_vidro" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_medicao" uuid NOT NULL,
	"driver_id" uuid,
	"vehicle_id" uuid,
	"vehicle_plate" varchar(20),
	"route_notes" text,
	"levar_perfil_estrutural" boolean DEFAULT false NOT NULL,
	"levar_perfis_total" boolean DEFAULT false NOT NULL,
	"levar_acessorios" boolean DEFAULT false NOT NULL,
	"levar_vidros" boolean DEFAULT false NOT NULL,
	"transporte_concluido" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"roles" "user_roles"[] NOT NULL,
	"password_hash" varchar(255),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"plate" varchar(20) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"measurement_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"event_type" "work_event_type" NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cutting_plans" ADD CONSTRAINT "cutting_plans_id_medicao_measurements_id_fk" FOREIGN KEY ("id_medicao") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installation_logs" ADD CONSTRAINT "installation_logs_id_medicao_measurements_id_fk" FOREIGN KEY ("id_medicao") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_cutting_plan_id_cutting_plans_id_fk" FOREIGN KEY ("cutting_plan_id") REFERENCES "public"."cutting_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_transport_log_id_transport_logs_id_fk" FOREIGN KEY ("transport_log_id") REFERENCES "public"."transport_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_installation_log_id_installation_logs_id_fk" FOREIGN KEY ("installation_log_id") REFERENCES "public"."installation_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_id_medicao_measurements_id_fk" FOREIGN KEY ("id_medicao") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_events" ADD CONSTRAINT "work_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_events" ADD CONSTRAINT "work_events_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cut_medicao_unique" ON "cutting_plans" USING btree ("id_medicao");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inst_medicao_unique" ON "installation_logs" USING btree ("id_medicao");--> statement-breakpoint
CREATE INDEX "idx_meas_type" ON "measurements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_meas_status" ON "measurements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_meas_etapa" ON "measurements" USING btree ("etapa");--> statement-breakpoint
CREATE INDEX "idx_meas_priority" ON "measurements" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_meas_assigned" ON "measurements" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "idx_meas_updated_at" ON "measurements" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_meas_etapa_updated" ON "measurements" USING btree ("etapa","updated_at");--> statement-breakpoint
CREATE INDEX "idx_meas_etapa_assigned_updated" ON "measurements" USING btree ("etapa","assigned_user_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "idx_status_history_measurement" ON "status_history" USING btree ("measurement_id");--> statement-breakpoint
CREATE INDEX "idx_status_history_created" ON "status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_status_history_measurement_created" ON "status_history" USING btree ("measurement_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_status_history_changed_by" ON "status_history" USING btree ("changed_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_trans_medicao_unique" ON "transport_logs" USING btree ("id_medicao");--> statement-breakpoint
CREATE INDEX "idx_trans_driver" ON "transport_logs" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_trans_vehicle" ON "transport_logs" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_users_roles_gin" ON "users" USING gin ("roles");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vehicles_plate" ON "vehicles" USING btree ("plate");--> statement-breakpoint
CREATE INDEX "idx_vehicles_active" ON "vehicles" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_work_events_unique" ON "work_events" USING btree ("measurement_id","item_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_work_events_user_id" ON "work_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_work_events_created_at" ON "work_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_work_events_user_created" ON "work_events" USING btree ("user_id","created_at");