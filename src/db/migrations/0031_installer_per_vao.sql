-- Move installer assignment from per-OS (installation_logs columns) to per-vão (measurements.items JSONB)
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "installer_id";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "scheduled_installation_date";
DROP INDEX IF EXISTS "idx_inst_installer";
