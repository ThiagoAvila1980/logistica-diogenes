CREATE TYPE "public"."servico_escopo" AS ENUM('vao', 'avulso');--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" varchar(255) NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"tempo" varchar(64),
	"meta" varchar(64),
	"bonus" numeric(12, 2),
	"escopo" "servico_escopo" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_servicos_descricao" ON "servicos" USING btree ("descricao");--> statement-breakpoint
CREATE INDEX "idx_servicos_escopo" ON "servicos" USING btree ("escopo");--> statement-breakpoint
INSERT INTO "servicos" ("descricao", "valor", "tempo", "meta", "bonus", "escopo")
VALUES
  ('Mola', 50.00, '2,5 h', NULL, NULL, 'vao'),
  ('Veneziana grande (Dom)', 50.00, '1,5 h', NULL, NULL, 'vao'),
  ('Veneziana pequena (Wonder)', 25.00, '1,5 h', NULL, NULL, 'vao'),
  ('Janela esquadria', 25.00, '2 h', '4 por dia', 5.00, 'vao'),
  ('Vidro fixo / móvel', 50.00, '2 h', '5 por dia', 5.00, 'vao'),
  ('Tubos 50/50 e 25/50', 30.00, NULL, NULL, NULL, 'vao'),
  ('Tubos de 50/100 para cima', 50.00, NULL, NULL, NULL, 'vao'),
  ('Espelho unitário (pequeno)', 25.00, NULL, NULL, NULL, 'vao'),
  ('Corrida (material/vidro)', 25.00, NULL, NULL, NULL, 'avulso'),
  ('Corrida + vidro', 25.00, NULL, 'por peça', 5.00, 'avulso'),
  ('Visita - verificação ou medição', 25.00, NULL, '1 visita', NULL, 'avulso'),
  ('Assistência pessoal', 5.00, NULL, NULL, NULL, 'avulso'),
  ('Assistência terceiro/novo', 50.00, '2 h', 'cada hora a mais', 10.00, 'avulso'),
  ('Deslocamento com carro', 100.00, NULL, 'batendo a meta do dia', NULL, 'avulso')
ON CONFLICT ("descricao") DO NOTHING;