"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, AlertTriangle } from "lucide-react";
import type { OsStatus } from "@/db/schema";
import { advanceOSStatus } from "@/actions/os-actions";
import { transitionServiceOrderStatus } from "@/actions/service-order";
import {
  getPrimaryNextStatus,
  STATUS_LABELS,
} from "@/lib/workflow/status-machine";
import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";
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

type Props = {
  osId: string;
  currentStatus: OsStatus;
  revisionFromStatus: OsStatus | null;
  revisionReason: string | null;
};

export function StatusTransitionPanel({
  osId,
  currentStatus,
  revisionFromStatus,
  revisionReason,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [reason, setReason] = useState("");

  const nextStatus =
    currentStatus === "revisao"
      ? revisionFromStatus
      : getPrimaryNextStatus(currentStatus);

  function runAdvance() {
    if (!nextStatus || nextStatus === "revisao") return;
    setMessage(null);
    startTransition(async () => {
      const result = await advanceOSStatus({
        osId,
        nextStatus: nextStatus as AdvanceTargetStatus,
      });

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  }

  function runRevision(toStatus: OsStatus, revisionReason?: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await transitionServiceOrderStatus({
        osId,
        toStatus,
        reason: revisionReason,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: `Status atualizado: ${STATUS_LABELS[result.status]}`,
        });
        setRevisionOpen(false);
        setReason("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  }

  const canAdvance =
    nextStatus !== null && currentStatus !== "concluido";

  return (
    <div className="space-y-4">
      {currentStatus === "revisao" && revisionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Motivo da revisão</p>
          <p className="mt-1 text-muted-foreground">{revisionReason}</p>
          {revisionFromStatus && (
            <p className="mt-2 text-xs text-muted-foreground">
              Retomar em: {STATUS_LABELS[revisionFromStatus]}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canAdvance && nextStatus && (
          <Button
            disabled={pending}
            onClick={runAdvance}
          >
            <ArrowRight className="h-4 w-4" />
            Avançar para {STATUS_LABELS[nextStatus]}
          </Button>
        )}

        {currentStatus === "revisao" && revisionFromStatus && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => runRevision(revisionFromStatus)}
          >
            <RotateCcw className="h-4 w-4" />
            Retomar fluxo
          </Button>
        )}

        {currentStatus !== "concluido" && currentStatus !== "revisao" && (
          <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={pending}>
                <AlertTriangle className="h-4 w-4" />
                Enviar para revisão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar para revisão</DialogTitle>
                <DialogDescription>
                  Descreva o motivo (ex.: vidro quebrado no transporte, medição
                  divergente).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="revision-reason">Motivo</Label>
                <Textarea
                  id="revision-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o problema..."
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={pending || reason.trim().length < 3}
                  onClick={() => runRevision("revisao", reason.trim())}
                >
                  Confirmar revisão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {message && (
        <p
          className={
            message.type === "success"
              ? "text-sm text-emerald-600"
              : "text-sm text-destructive"
          }
          role="alert"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
