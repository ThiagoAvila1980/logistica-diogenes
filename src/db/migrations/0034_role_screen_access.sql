-- Matriz de acesso tela x papel — permite que o admin configure quais telas
-- cada papel (role) enxerga no menu e pode abrir.
-- admin sempre tem acesso total e NÃO é armazenado aqui.

CREATE TABLE IF NOT EXISTS "role_screen_access" (
  "role"       "user_roles"  NOT NULL,
  "screen"     TEXT          NOT NULL,
  "enabled"    BOOLEAN       NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY ("role", "screen")
);

-- Seed com os defaults atuais de ROLE_ROUTE_ACCESS
INSERT INTO "role_screen_access" ("role", "screen", "enabled") VALUES
  ('gerente',   'production',   true),
  ('gerente',   'logistics',    true),
  ('gerente',   'installation', true),
  ('gerente',   'concluded',    true),
  ('gerente',   'dashboard',    false),
  ('gerente',   'field',        false),

  ('medidor',   'field',        true),
  ('medidor',   'production',   false),
  ('medidor',   'logistics',    false),
  ('medidor',   'installation', false),
  ('medidor',   'concluded',    false),
  ('medidor',   'dashboard',    false),

  ('cortador',  'production',   true),
  ('cortador',  'field',        false),
  ('cortador',  'logistics',    false),
  ('cortador',  'installation', false),
  ('cortador',  'concluded',    false),
  ('cortador',  'dashboard',    false),

  ('motorista', 'logistics',    true),
  ('motorista', 'field',        false),
  ('motorista', 'production',   false),
  ('motorista', 'installation', false),
  ('motorista', 'concluded',    false),
  ('motorista', 'dashboard',    false),

  ('instalador','installation', true),
  ('instalador','concluded',    true),
  ('instalador','field',        false),
  ('instalador','production',   false),
  ('instalador','logistics',    false),
  ('instalador','dashboard',    false)
ON CONFLICT ("role", "screen") DO NOTHING;
