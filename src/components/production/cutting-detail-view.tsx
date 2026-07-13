"use client";

import { useState } from "react";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { CuttingChecklist } from "@/components/production/cutting-checklist";
import { ProductionMeasurementMedia } from "@/components/production/production-measurement-media";
import { CuttingNotesField } from "@/components/production/cutting-notes-field";

type Props = {
  osId: string;
  osStatus: string;
  items: MeasurementLineItem[];
  photos: string[];
  lookups: MeasurementLookups;
  cutterNotes: string | null;
  canEditDrawings?: boolean;
};

export function CuttingDetailView({
  osId,
  osStatus,
  items,
  photos,
  lookups,
  cutterNotes,
  canEditDrawings = false,
}: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    items.length > 0 ? (items[0]?.id ?? null) : null,
  );

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;

  // Filtra apenas o vão selecionado; fotos legadas (nível de medição) só aparecem
  // quando nenhum vão estiver selecionado (não deve ocorrer com seleção automática).
  const filteredItems = selectedItem ? [selectedItem] : items;
  const filteredPhotos = selectedItem ? [] : photos;

  return (
    <>
      <CuttingChecklist
        osId={osId}
        osStatus={osStatus}
        items={items}
        lookups={lookups}
        selectedItemId={selectedItemId}
        onItemSelect={setSelectedItemId}
      />

      <ProductionMeasurementMedia
        osId={osId}
        items={filteredItems}
        photos={filteredPhotos}
        lookups={lookups}
        canEditDrawings={canEditDrawings}
      />

      <CuttingNotesField osId={osId} initialNotes={cutterNotes} />
    </>
  );
}
