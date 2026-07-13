"use client";

import { useEffect } from "react";
import { cacheOrderDetail } from "@/lib/offline/cache-manager";
import type { OrderDetail } from "@/lib/data/types";
import type { FieldMeasurementDraft } from "@/lib/data/field";
import type { MeasurementLookups } from "@/lib/data/lookup-types";

interface FieldDetailCacheHydratorProps {
  order: OrderDetail;
  draftsByType: {
    orcamento?: FieldMeasurementDraft;
    final?: FieldMeasurementDraft;
  };
  lookups: MeasurementLookups;
}

/**
 * Componente invisível que salva o snapshot da OS (dados + rascunhos +
 * lookups) sempre que a tela de medição /field/[osId] carrega com internet
 * disponível — permite reabrir a mesma OS offline com os dados do servidor.
 */
export function FieldDetailCacheHydrator({
  order,
  draftsByType,
  lookups,
}: FieldDetailCacheHydratorProps) {
  useEffect(() => {
    cacheOrderDetail({ osId: order.id, order, draftsByType, lookups }).catch(
      () => {
        // Cache é best-effort — não interromper se falhar
      },
    );
  }, [order, draftsByType, lookups]);

  return null;
}
