-- Origem das medidas (dois caminhos no pipeline)
CREATE TYPE "public"."measurement_flow" AS ENUM('cliente_informou', 'profissional_mediu');

ALTER TABLE "service_orders"
  ADD COLUMN "measurement_flow" "measurement_flow" DEFAULT 'cliente_informou' NOT NULL;
