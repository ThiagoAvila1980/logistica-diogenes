-- Migra registros ativos para os novos status (após 0012)
UPDATE "service_orders" SET "status" = 'medicao_orcamento'
  WHERE "status" IN ('orcamento_enviado', 'aprovado_cliente');

UPDATE "service_orders" SET "status" = 'cortes'
  WHERE "status" IN ('os_gerada', 'em_corte');

UPDATE "service_orders" SET "status" = 'embalagem'
  WHERE "status" = 'corte_concluido';

UPDATE "service_orders" SET "status" = 'transporte_perfil'
  WHERE "status" = 'em_transporte';

UPDATE "service_orders" SET "status" = 'transporte_levar_vidro'
  WHERE "status" = 'transporte_entregue';

UPDATE "service_orders" SET "status" = 'instalacao_vidros'
  WHERE "status" = 'instalacao_final';
