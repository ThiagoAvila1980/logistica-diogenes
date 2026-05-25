-- Move cor/vidro/envidraçamento do cabeçalho da medição para cada item (desenho)

UPDATE "measurements" m
SET "items" = (
  SELECT jsonb_agg(
    item
    || jsonb_strip_nulls(
      jsonb_build_object(
        'idCor',
        CASE
          WHEN NOT (item ? 'idCor') AND m."id_cor" IS NOT NULL THEN m."id_cor"::text
        END,
        'idTipoVidro',
        CASE
          WHEN NOT (item ? 'idTipoVidro') AND m."id_tipo_vidro" IS NOT NULL
          THEN m."id_tipo_vidro"::text
        END,
        'idTipoEnvidracamento',
        CASE
          WHEN NOT (item ? 'idTipoEnvidracamento')
            AND m."id_tipo_envidracamento" IS NOT NULL
          THEN m."id_tipo_envidracamento"::text
        END
      )
    )
  )
  FROM jsonb_array_elements(COALESCE(m."items", '[]'::jsonb)) AS item
)
WHERE m."items" IS NOT NULL
  AND jsonb_array_length(m."items") > 0
  AND (
    m."id_cor" IS NOT NULL
    OR m."id_tipo_vidro" IS NOT NULL
    OR m."id_tipo_envidracamento" IS NOT NULL
  );

ALTER TABLE "measurements" DROP CONSTRAINT IF EXISTS "measurements_id_cor_cores_id_cor_fk";
ALTER TABLE "measurements" DROP CONSTRAINT IF EXISTS "measurements_id_tipo_vidro_tipo_vidro_id_tipo_vidro_fk";
ALTER TABLE "measurements" DROP CONSTRAINT IF EXISTS "measurements_id_tipo_envidracamento_tipo_envidracamento_id_tipo_envidracamento_fk";

ALTER TABLE "measurements" DROP COLUMN IF EXISTS "id_cor";
ALTER TABLE "measurements" DROP COLUMN IF EXISTS "id_tipo_vidro";
ALTER TABLE "measurements" DROP COLUMN IF EXISTS "id_tipo_envidracamento";
