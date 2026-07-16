CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_medicao" uuid NOT NULL,
	"pedido_feito" boolean DEFAULT false NOT NULL,
	"pedido_feito_at" timestamp with time zone,
	"pedido_feito_por_id" uuid,
	"pedido_recebido" boolean DEFAULT false NOT NULL,
	"pedido_recebido_at" timestamp with time zone,
	"pedido_recebido_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_id_medicao_measurements_id_fk" FOREIGN KEY ("id_medicao") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_pedido_feito_por_id_users_id_fk" FOREIGN KEY ("pedido_feito_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_pedido_recebido_por_id_users_id_fk" FOREIGN KEY ("pedido_recebido_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pedidos_medicao_unique" ON "pedidos" USING btree ("id_medicao");--> statement-breakpoint
CREATE INDEX "idx_pedidos_feito_por" ON "pedidos" USING btree ("pedido_feito_por_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_recebido_por" ON "pedidos" USING btree ("pedido_recebido_por_id");