"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Scissors } from "lucide-react";
import { moveOSCard } from "@/actions/kanban-actions";
import { KanbanMoveConfirmDialog } from "@/components/kanban/kanban-move-confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getAllowedTransitions } from "@/lib/workflow/status-machine";
import type { OsStatus } from "@/db/schema";

const SOURCE_STATUS: OsStatus = "medicao_final";
const DEST_STATUS: OsStatus = "cortes";

type SendToCuttingButtonProps = {
  osId: string;
  osNumber: string;
  clientName: string;
  orderStatus: OsStatus;
};

export function SendToCuttingButton({
  osId,
  osNumber,
  clientName,
  orderStatus,
}: SendToCuttingButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSend =
    orderStatus === SOURCE_STATUS &&
    getAllowedTransitions(orderStatus).includes(DEST_STATUS);

  const handleRequest = useCallback(() => {
    setError(null);
    setSuccess(null);
    setConfirmOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (isPending) return;
    setConfirmOpen(false);
  }, [isPending]);

  const handleConfirm = useCallback(() => {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await moveOSCard(osId, DEST_STATUS);
      if (!result.success) {
        setError(result.message ?? "Não foi possível enviar para o corte.");
        return;
      }
      setSuccess(
        result.notificationSummary ??
          "Medição enviada para o plano de corte.",
      );
      router.push("/field");
      router.refresh();
    });
  }, [osId, router]);

  if (!canSend) return null;

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        className="h-12 w-full text-base"
        onClick={handleRequest}
        disabled={isPending}
      >
        <Scissors className="mr-2 h-4 w-4" />
        {isPending ? "Enviando…" : "Enviar para corte"}
      </Button>

      <KanbanMoveConfirmDialog
        pending={
          confirmOpen
            ? {
                osId,
                osNumber,
                clientName,
                sourceStatus: SOURCE_STATUS,
                destStatus: DEST_STATUS,
                sourcePhaseId: "medicao",
                destPhaseId: "plano_corte",
              }
            : null
        }
        isSubmitting={isPending}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
