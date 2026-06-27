"use client";

import { EditMeasurementHeaderDialog } from "@/components/field/edit-measurement-header-dialog";

type MeasurementHeaderEditActionProps = {
  osId: string;
  clientName: string;
  clientPhone: string | null;
  clientAddress: string | null;
  budgetReference: string | null;
};

export function MeasurementHeaderEditAction({
  osId,
  clientName,
  clientPhone,
  clientAddress,
  budgetReference,
}: MeasurementHeaderEditActionProps) {
  return (
    <EditMeasurementHeaderDialog
      osId={osId}
      clientName={clientName}
      clientPhone={clientPhone}
      clientAddress={clientAddress}
      budgetReference={budgetReference}
    />
  );
}
