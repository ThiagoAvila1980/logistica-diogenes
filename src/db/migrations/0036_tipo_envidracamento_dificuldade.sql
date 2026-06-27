ALTER TABLE "tipo_envidracamento"
  ADD COLUMN IF NOT EXISTS "dificuldade" integer DEFAULT 1 NOT NULL;
