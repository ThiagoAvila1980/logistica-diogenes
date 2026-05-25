-- Lookup tables
CREATE TABLE IF NOT EXISTS "cores" (
  "id_cor" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "descricao" varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "tipo_vidro" (
  "id_tipo_vidro" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "descricao" varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "tipo_envidracamento" (
  "id_tipo_envidracamento" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "descricao" varchar(255) NOT NULL
);

-- Seed defaults
INSERT INTO "cores" ("descricao") VALUES ('Branco'), ('Preto'), ('Bronze'), ('Natural');
INSERT INTO "tipo_vidro" ("descricao") VALUES ('Temperado 8mm'), ('Temperado 10mm'), ('Laminado'), ('Comum');
INSERT INTO "tipo_envidracamento" ("descricao") VALUES ('Correr'), ('Abrir'), ('Pivotante'), ('Fixo');

-- Measurement status & priority
DO $$ BEGIN
  CREATE TYPE "measurement_status" AS ENUM ('pendente', 'medida');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "measurement_priority" AS ENUM ('normal', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Expand measurements with fields from service_orders
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "number" varchar(32);
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "status" "measurement_status" DEFAULT 'pendente' NOT NULL;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "etapa" "os_status" DEFAULT 'medicao_final' NOT NULL;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "priority" "measurement_priority" DEFAULT 'normal' NOT NULL;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "id_cor" uuid REFERENCES "cores"("id_cor") ON DELETE SET NULL;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "id_tipo_vidro" uuid REFERENCES "tipo_vidro"("id_tipo_vidro") ON DELETE SET NULL;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "id_tipo_envidracamento" uuid REFERENCES "tipo_envidracamento"("id_tipo_envidracamento") ON DELETE SET NULL;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "assigned_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "budget_reference" varchar(64);
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "source_pdf_url" text;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "scheduled_date" timestamptz;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "due_date" timestamptz;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "revision_reason" text;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "revision_from_etapa" "os_status";

-- Migrate OS data into primary measurement per OS
UPDATE "measurements" m
SET
  "number" = so."number",
  "etapa" = so."status",
  "priority" = CASE so."priority"
    WHEN 'baixa' THEN 'normal'::measurement_priority
    WHEN 'normal' THEN 'normal'::measurement_priority
    WHEN 'alta' THEN 'alta'::measurement_priority
    WHEN 'urgente' THEN 'urgente'::measurement_priority
    ELSE 'normal'::measurement_priority
  END,
  "assigned_user_id" = so."assigned_user_id",
  "description" = so."description",
  "budget_reference" = so."budget_reference",
  "source_pdf_url" = so."source_pdf_url",
  "scheduled_date" = so."scheduled_date",
  "due_date" = so."due_date",
  "revision_reason" = so."revision_reason",
  "revision_from_etapa" = so."revision_from_status",
  "status" = CASE
    WHEN m."items" IS NOT NULL AND jsonb_array_length(m."items") > 0 THEN 'medida'::measurement_status
    ELSE 'pendente'::measurement_status
  END
FROM "service_orders" so
WHERE m."os_id" = so."id"
  AND m."id" = (
    SELECT m2."id" FROM "measurements" m2
    WHERE m2."os_id" = so."id"
    ORDER BY CASE WHEN m2."type" = 'final'::measurement_types THEN 0 ELSE 1 END
    LIMIT 1
  );

-- Generate numbers for orphan measurements
UPDATE "measurements"
SET "number" = 'MED-' || substr(replace("id"::text, '-', ''), 1, 8)
WHERE "number" IS NULL;

ALTER TABLE "measurements" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_measurements_number" ON "measurements" ("number");

-- Repoint child tables: cutting_plans
ALTER TABLE "cutting_plans" ADD COLUMN IF NOT EXISTS "id_medicao" uuid;

UPDATE "cutting_plans" cp
SET "id_medicao" = (
  SELECT m."id" FROM "measurements" m
  WHERE m."os_id" = cp."os_id"
  ORDER BY CASE WHEN m."type" = 'final'::measurement_types THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE "id_medicao" IS NULL;

ALTER TABLE "cutting_plans" DROP CONSTRAINT IF EXISTS "cutting_plans_os_id_service_orders_id_fk";
DROP INDEX IF EXISTS "idx_cut_os";
DROP INDEX IF EXISTS "idx_cut_os_unique";
ALTER TABLE "cutting_plans" DROP COLUMN IF EXISTS "os_id";
ALTER TABLE "cutting_plans" DROP COLUMN IF EXISTS "cuts";
ALTER TABLE "cutting_plans" DROP COLUMN IF EXISTS "packaging";
ALTER TABLE "cutting_plans" DROP COLUMN IF EXISTS "accessories";
ALTER TABLE "cutting_plans" DROP COLUMN IF EXISTS "status";

ALTER TABLE "cutting_plans" ALTER COLUMN "id_medicao" SET NOT NULL;
ALTER TABLE "cutting_plans" ADD CONSTRAINT "cutting_plans_id_medicao_measurements_id_fk"
  FOREIGN KEY ("id_medicao") REFERENCES "measurements"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cut_medicao_unique" ON "cutting_plans" ("id_medicao");
CREATE INDEX IF NOT EXISTS "idx_cut_medicao" ON "cutting_plans" ("id_medicao");

-- Repoint transport_logs
ALTER TABLE "transport_logs" ADD COLUMN IF NOT EXISTS "id_medicao" uuid;

UPDATE "transport_logs" tl
SET "id_medicao" = (
  SELECT m."id" FROM "measurements" m
  WHERE m."os_id" = tl."os_id"
  ORDER BY CASE WHEN m."type" = 'final'::measurement_types THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE "id_medicao" IS NULL;

ALTER TABLE "transport_logs" DROP CONSTRAINT IF EXISTS "transport_logs_os_id_service_orders_id_fk";
DROP INDEX IF EXISTS "idx_trans_os";
DROP INDEX IF EXISTS "idx_trans_os_unique";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "os_id";

ALTER TABLE "transport_logs" ALTER COLUMN "id_medicao" SET NOT NULL;
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_id_medicao_measurements_id_fk"
  FOREIGN KEY ("id_medicao") REFERENCES "measurements"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_trans_medicao_unique" ON "transport_logs" ("id_medicao");
CREATE INDEX IF NOT EXISTS "idx_trans_medicao" ON "transport_logs" ("id_medicao");

-- Repoint installation_logs
ALTER TABLE "installation_logs" ADD COLUMN IF NOT EXISTS "id_medicao" uuid;

UPDATE "installation_logs" il
SET "id_medicao" = (
  SELECT m."id" FROM "measurements" m
  WHERE m."os_id" = il."os_id"
  ORDER BY CASE WHEN m."type" = 'final'::measurement_types THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE "id_medicao" IS NULL;

ALTER TABLE "installation_logs" DROP CONSTRAINT IF EXISTS "installation_logs_os_id_service_orders_id_fk";
DROP INDEX IF EXISTS "idx_inst_os";
DROP INDEX IF EXISTS "idx_inst_os_unique";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "os_id";

ALTER TABLE "installation_logs" ALTER COLUMN "id_medicao" SET NOT NULL;
ALTER TABLE "installation_logs" ADD CONSTRAINT "installation_logs_id_medicao_measurements_id_fk"
  FOREIGN KEY ("id_medicao") REFERENCES "measurements"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_inst_medicao_unique" ON "installation_logs" ("id_medicao");
CREATE INDEX IF NOT EXISTS "idx_inst_medicao" ON "installation_logs" ("id_medicao");

-- Repoint status_history
ALTER TABLE "status_history" ADD COLUMN IF NOT EXISTS "measurement_id" uuid;

UPDATE "status_history" sh
SET "measurement_id" = (
  SELECT m."id" FROM "measurements" m
  WHERE m."os_id" = sh."os_id"
  ORDER BY CASE WHEN m."type" = 'final'::measurement_types THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE "measurement_id" IS NULL;

ALTER TABLE "status_history" DROP CONSTRAINT IF EXISTS "status_history_os_id_service_orders_id_fk";
DROP INDEX IF EXISTS "idx_status_history_os";
DROP INDEX IF EXISTS "idx_status_history_os_created";
ALTER TABLE "status_history" DROP COLUMN IF EXISTS "os_id";

ALTER TABLE "status_history" ALTER COLUMN "measurement_id" SET NOT NULL;
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_measurement_id_measurements_id_fk"
  FOREIGN KEY ("measurement_id") REFERENCES "measurements"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_status_history_measurement" ON "status_history" ("measurement_id");
CREATE INDEX IF NOT EXISTS "idx_status_history_measurement_created" ON "status_history" ("measurement_id", "created_at");

-- Update notifications
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "measurement_id" uuid REFERENCES "measurements"("id") ON DELETE SET NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "cutting_plan_id" uuid REFERENCES "cutting_plans"("id") ON DELETE SET NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "transport_log_id" uuid REFERENCES "transport_logs"("id") ON DELETE SET NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "installation_log_id" uuid REFERENCES "installation_logs"("id") ON DELETE SET NULL;

UPDATE "notifications" n
SET "measurement_id" = (
  SELECT m."id" FROM "measurements" m
  WHERE m."os_id" = n."os_id"
  ORDER BY CASE WHEN m."type" = 'final'::measurement_types THEN 0 ELSE 1 END
  LIMIT 1
)
WHERE n."os_id" IS NOT NULL AND n."measurement_id" IS NULL;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_os_id_service_orders_id_fk";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "os_id";

-- Remove measurements.os_id and duplicate rows
DROP INDEX IF EXISTS "idx_meas_os";
DROP INDEX IF EXISTS "idx_meas_os_type";

DELETE FROM "measurements" m
WHERE m."os_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "measurements" m2
    WHERE m2."os_id" = m."os_id"
      AND m2."id" <> m."id"
      AND (
        m2."type" = 'final'::measurement_types
        OR (m."type" = 'orcamento'::measurement_types AND m2."type" = 'final'::measurement_types)
      )
  );

ALTER TABLE "measurements" DROP CONSTRAINT IF EXISTS "measurements_os_id_service_orders_id_fk";
ALTER TABLE "measurements" DROP COLUMN IF EXISTS "os_id";

-- Drop service_orders and quotes
DROP TABLE IF EXISTS "quotes" CASCADE;
DROP TABLE IF EXISTS "stage_sla_config" CASCADE;
DROP TABLE IF EXISTS "service_orders" CASCADE;

-- Indexes on measurements
CREATE INDEX IF NOT EXISTS "idx_meas_status" ON "measurements" ("status");
CREATE INDEX IF NOT EXISTS "idx_meas_etapa" ON "measurements" ("etapa");
CREATE INDEX IF NOT EXISTS "idx_meas_priority" ON "measurements" ("priority");
CREATE INDEX IF NOT EXISTS "idx_meas_assigned" ON "measurements" ("assigned_user_id");
CREATE INDEX IF NOT EXISTS "idx_meas_etapa_updated" ON "measurements" ("etapa", "updated_at");
