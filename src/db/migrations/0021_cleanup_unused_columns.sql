-- Remove colunas legadas e não utilizadas pelo fluxo operacional atual (checklists + kanban)

-- measurements: campos offline/SLA nunca implementados
ALTER TABLE "measurements" DROP COLUMN IF EXISTS "due_date";
ALTER TABLE "measurements" DROP COLUMN IF EXISTS "client_device_id";
ALTER TABLE "measurements" DROP COLUMN IF EXISTS "synced_at";
ALTER TABLE "measurements" DROP COLUMN IF EXISTS "technician_id";
DROP INDEX IF EXISTS "idx_meas_technician";

-- cutting_plans: campos do fluxo de avanço legado
ALTER TABLE "cutting_plans" DROP COLUMN IF EXISTS "completed_at";
ALTER TABLE "cutting_plans" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "cutting_plans" DROP COLUMN IF EXISTS "operator_id";
DROP INDEX IF EXISTS "idx_cut_operator";

-- transport_logs: fotos/checklist JSON e status legados
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "items_checked";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "load_photos";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "delivery_photos";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "delivery_proof_url";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "status";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "departure_at";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "arrival_at";
ALTER TABLE "transport_logs" DROP COLUMN IF EXISTS "levar_vidro";
DROP INDEX IF EXISTS "idx_trans_status";

-- installation_logs: flags legadas substituídas por instalacao_*_feita
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "structural_installed";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "glass_installed";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "final_completed";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "signature_url";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "signed_at";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "signed_by_name";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "status";
ALTER TABLE "installation_logs" DROP COLUMN IF EXISTS "completed_at";
DROP INDEX IF EXISTS "idx_inst_status";

-- passkeys biométricos: feature não integrada ao fluxo ativo
DROP TABLE IF EXISTS "user_passkeys";

-- enums órfãos após remoção das colunas
DROP TYPE IF EXISTS "transport_status";
DROP TYPE IF EXISTS "installation_status";
DROP TYPE IF EXISTS "cutting_status";
