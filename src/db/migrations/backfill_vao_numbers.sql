-- Backfill de vaoNumber para vãos existentes (measurements.items é jsonb).
-- Preenche vaoNumber = posição atual do item no array (1-based) para todo
-- item que ainda não tenha o campo, preservando a ordem já usada como
-- "Vão N" em todas as telas até hoje.
--
-- Executar direto no banco (fora do fluxo de migrations do Drizzle, pois
-- não há alteração estrutural de coluna — apenas dados dentro do jsonb).

update measurements
set items = (
  select jsonb_agg(
    case
      when elem ? 'vaoNumber' then elem
      else jsonb_set(elem, '{vaoNumber}', to_jsonb(idx))
    end
    order by idx
  )
  from jsonb_array_elements(items) with ordinality as t(elem, idx)
)
where items is not null
  and jsonb_array_length(items) > 0
  and exists (
    select 1
    from jsonb_array_elements(items) as elem
    where not (elem ? 'vaoNumber')
  );
