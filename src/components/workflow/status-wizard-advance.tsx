"use client";

import { useState, useOptimistic, startTransition } from "react";
import type { OrderDetail } from "@/lib/data/types";
import type { OsStatus } from "@/db/schema";
import { getNextAdvanceStep } from "@/lib/workflow/advance-flow";
import { StatusWizard } from "@/components/workflow/status-wizard";
import { OSAdvanceForm } from "@/components/os-advance-form";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/permissions";
import { canAdvanceToStatus } from "@/lib/auth/permissions";

type Props = {
  order: OrderDetail;
  userRoles: readonly UserRole[];
};

export function StatusWizardAdvance({ order, userRoles }: Props) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    order.status,
    (_current, next: OsStatus) => next,
  );

  const [isAdvancing, setIsAdvancing] = useState(false);
  const displayStatus = isAdvancing ? optimisticStatus : order.status;
  const nextStep = getNextAdvanceStep(displayStatus);
  const canAdvance =
    nextStep != null && canAdvanceToStatus(userRoles, nextStep);

  return (
    <div className="space-y-6">
      <StatusWizard
        currentStatus={displayStatus}
        pending={isAdvancing}
        className={cn(isAdvancing && "opacity-90")}
      />

      {canAdvance && nextStep ? (
        <OSAdvanceForm
          key={`${order.id}-${displayStatus}-${nextStep}`}
          osId={order.id}
          currentStatus={displayStatus}
          nextStatus={nextStep}
          onAdvanceStart={(next) => {
            startTransition(() => {
              setOptimisticStatus(next);
              setIsAdvancing(true);
            });
          }}
          onSuccess={() => setIsAdvancing(false)}
          onError={() => setIsAdvancing(false)}
        />
      ) : nextStep && !canAdvance ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Seus papéis não permitem avançar esta etapa. Peça a um gerente
          ou admin.
        </div>
      ) : (
        <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          Todas as etapas concluídas ou nenhum avanço disponível.
        </div>
      )}
    </div>
  );
}
