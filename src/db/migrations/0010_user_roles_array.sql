-- Um usuário pode ter vários papéis (ex.: motorista + instalador)
ALTER TABLE "users" ADD COLUMN "roles" "user_roles"[] NOT NULL DEFAULT ARRAY['medidor']::"user_roles"[];--> statement-breakpoint
UPDATE "users" SET "roles" = ARRAY["role"]::"user_roles"[];--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_users_role";--> statement-breakpoint
CREATE INDEX "idx_users_roles" ON "users" USING gin ("roles");
