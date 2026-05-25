"use client";

import { useState, useOptimistic, useTransition, startTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import type { OrderDetail } from "@/lib/data/types";
import type { OsStatus } from "@/db/schema";
import { transitionServiceOrderStatus } from "@/actions/service-order";
import { getNextAdvanceStep } from "@/lib/workflow/advance-flow";
import { kanbanColumnTitle } from "@/lib/kanban/column-labels";
import { StatusWizard } from "@/components/workflow/status-wizard";
import { OSAdvanceForm } from "@/components/os-advance-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/permissions";
import {
  canAdvanceToStatus,
  canPerformRevision,
} from "@/lib/auth/permissions";

type Props = {
  order: OrderDetail;
  userRoles: readonly UserRole[];
};

export function StatusWizardAdvance({ order, userRoles }: Props) {
  const router = useRouter();
  const [revisionPending, startRevisionTransition] = useTransition();
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [revisionMessage, setRevisionMessage] = useState<string | null>(null);

  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    order.status,
    (_current, next: OsStatus) => next,
  );

  const [isAdvancing, setIsAdvancing] = useState(false);
  const displayStatus = isAdvancing ? optimisticStatus : order.status;
  const nextStep = getNextAdvanceStep(displayStatus);
  const canAdvance =
    nextStep != null && canAdvanceToStatus(userRoles, nextStep);
  const canRevise = canPerformRevision(userRoles);

  function handleRevision(toStatus: OsStatus, reason?: string) {
    setRevisionMessage(null);
    startRevisionTransition(async () => {
      const result = await transitionServiceOrderStatus({
        osId: order.id,
        toStatus,
        reason,
      });
      if (result.success) {
        setRevisionMessage(`Status: ${kanbanColumnTitle(result.status)}`);
        setRevisionOpen(false);
        setRevisionReason("");
        router.refresh();
      } else {
        setRevisionMessage(result.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <StatusWizard
        currentStatus={displayStatus}
        pending={isAdvancing}
        className={cn(isAdvancing && "opacity-90")}
      />

      {displayStatus === "revisao" && order.revisionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Motivo da revisão</p>
          <p className="mt-1 text-muted-foreground">{order.revisionReason}</p>
        </div>
      )}

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
      ) : displayStatus !== "revisao" && nextStep && !canAdvance ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Seus papéis não permitem avançar esta etapa. Peça a um gerente
          ou admin.
        </div>
      ) : displayStatus !== "revisao" ? (
        <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          Todas as etapas concluídas ou nenhum avanço disponível.
        </div>
      ) : null}

      {displayStatus === "revisao" && order.revisionFromStatus && canRevise && (
        <Button
          type="button"
          variant="secondary"
          disabled={revisionPending}
          onClick={() => handleRevision(order.revisionFromStatus!)}
        >
          <RotateCcw className="h-4 w-4" />
          Retomar fluxo ({kanbanColumnTitle(order.revisionFromStatus)})
        </Button>
      )}

      {canRevise &&
        displayStatus !== "concluido" &&
        displayStatus !== "revisao" && (
        <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={revisionPending}>
              <AlertTriangle className="h-4 w-4" />
              Enviar para revisão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar para revisão</DialogTitle>
              <DialogDescription>Informe o motivo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="revision-reason">Motivo</Label>
              <Textarea
                id="revision-reason"
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                disabled={revisionPending || revisionReason.trim().length < 3}
                onClick={() => handleRevision("revisao", revisionReason.trim())}
              >
                Confirmar revisão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {revisionMessage && (
        <p className="text-sm text-muted-foreground">{revisionMessage}</p>
      )}
    </div>
  );
}
