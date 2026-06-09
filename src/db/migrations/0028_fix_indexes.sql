-- Correção de índices de performance
-- 1) Remove índices B-tree redundantes nas tabelas com UNIQUE index na mesma coluna
--    O índice UNIQUE já serve como índice — o regular duplicado degrada writes.
DROP INDEX IF EXISTS "idx_cut_medicao";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_trans_medicao";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_inst_medicao";
--> statement-breakpoint

-- 2) Substitui índice B-tree em users.roles por GIN
--    O operador && (array overlap) exige GIN; B-tree é inútil para essa operação.
DROP INDEX IF EXISTS "idx_users_roles";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_roles_gin" ON "users" USING gin ("roles");
--> statement-breakpoint

-- 3) Índice composto em notifications(user_id, read_at) para queries de não-lidas
--    Cobre: count(*) WHERE user_id=$1 AND read_at IS NULL
--           UPDATE ... WHERE user_id=$1 AND read_at IS NULL
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id", "read_at");
--> statement-breakpoint

-- 4) Índice composto em measurements(etapa, assigned_user_id, updated_at)
--    Cobre o padrão de listServiceOrdersDb para usuários com permissão restrita:
--    WHERE etapa IN (...) AND (assigned_user_id IS NULL OR assigned_user_id=$1)
--    ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS "idx_meas_etapa_assigned_updated" ON "measurements" ("etapa", "assigned_user_id", "updated_at" DESC);
