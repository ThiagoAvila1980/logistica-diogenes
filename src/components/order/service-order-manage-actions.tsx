"use client";

import { DeleteMeasurementDialog } from "@/components/field/delete-measurement-dialog";
import { MeasurementHeaderEditAction } from "@/components/order/measurement-header-edit-action";

type ServiceOrderManageActionsProps = {
  osId: string;
  displayNumber: string;
  clientName: string;
  clientPhone?: string | null;
  clientAddress?: string | null;
  budgetReference?: string | null;
  canEditHeader?: boolean;
  canDelete?: boolean;
  redirectHref?: string;
};

export function ServiceOrderManageActions({
  osId,
  displayNumber,
  clientName,
  clientPhone,
  clientAddress,
  budgetReference,
  canEditHeader = false,
  canDelete = false,
  redirectHref = "/field",
}: ServiceOrderManageActionsProps) {
  if (!canEditHeader && !canDelete) return null;

  return (
    <>
      {canEditHeader ? (
        <MeasurementHeaderEditAction
          osId={osId}
          clientName={clientName}
          clientPhone={clientPhone ?? null}
          clientAddress={clientAddress ?? null}
          budgetReference={budgetReference ?? null}
        />
      ) : null}
      {canDelete ? (
        <DeleteMeasurementDialog
          osId={osId}
          displayNumber={displayNumber}
          clientName={clientName}
          redirectHref={redirectHref}
        />
      ) : null}
    </>
  );
}
