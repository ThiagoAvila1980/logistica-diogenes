CREATE TABLE IF NOT EXISTS "ambientes" (
  "id_ambiente" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "descricao" varchar(255) NOT NULL
);

INSERT INTO "ambientes" ("descricao")
VALUES ('Sala'), ('Quarto'), ('Varanda'), ('Cozinha'), ('Banheiro'), ('Área externa');

INSERT INTO "ambientes" ("descricao")
SELECT DISTINCT trim(item->>'ambiente')
FROM "measurements" m
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m."items", '[]'::jsonb)) AS item
WHERE item->>'ambiente' IS NOT NULL
  AND trim(item->>'ambiente') <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "ambientes" a
    WHERE lower(trim(a."descricao")) = lower(trim(item->>'ambiente'))
  );

UPDATE "measurements" m
SET "items" = (
  SELECT jsonb_agg(
    CASE
      WHEN item ? 'ambiente' AND trim(item->>'ambiente') <> '' THEN
        (item - 'ambiente')
        || jsonb_build_object(
          'idAmbiente',
          (
            SELECT a."id_ambiente"::text
            FROM "ambientes" a
            WHERE lower(trim(a."descricao")) = lower(trim(item->>'ambiente'))
            LIMIT 1
          )
        )
      WHEN item ? 'ambiente' THEN item - 'ambiente'
      ELSE item
    END
  )
  FROM jsonb_array_elements(COALESCE(m."items", '[]'::jsonb)) AS item
)
WHERE m."items" IS NOT NULL
  AND jsonb_array_length(m."items") > 0;
