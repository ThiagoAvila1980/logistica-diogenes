"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Phone,
  Save,
} from "lucide-react";
import {
  saveInstallationDraft,
  type SaveInstallationDraftResult,
} from "@/actions/installation-actions";
import { StatusWizardAdvance } from "@/components/workflow/status-wizard-advance";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { OrderDetail } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import type { InstallationDraft } from "@/lib/data/installation";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import type { UserRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type InstallationFormProps = {
  order: OrderDetail;
  initial?: InstallationDraft;
  userRoles: readonly UserRole[];
};

const PHASES = [
  { key: "instalacao_estrutural", label: "Estrutural" },
  { key: "instalacao_vidros", label: "Vidros" },
  { key: "concluido", label: "Concluído" },
] as const;

function phaseIndex(status: string): number {
  if (status === "concluido") return 2;
  const idx = PHASES.findIndex((p) => p.key === status);
  return idx >= 0 ? idx : 0;
}

export function InstallationForm({
  order,
  initial,
  userRoles,
}: InstallationFormProps) {
  const [photosBefore, setPhotosBefore] = useState<string[]>(
    initial?.photosBefore ?? [],
  );
  const [photosAfter, setPhotosAfter] = useState<string[]>(
    initial?.photosAfter ?? [],
  );
  const [pendingBefore, setPendingBefore] = useState<File[]>([]);
  const [pendingAfter, setPendingAfter] = useState<File[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const currentPhase = phaseIndex(order.status);
  const showPhotos =
    order.status === "instalacao_vidros" ||
    order.status === "concluido" ||
    currentPhase >= 2;

  const submitWithPhotos = useCallback(
    async (
      _prev: SaveInstallationDraftResult | null,
      formData: FormData,
    ): Promise<SaveInstallationDraftResult> => {
      photosBefore.forEach((url) => formData.append("existingBefore", url));
      photosAfter.forEach((url) => formData.append("existingAfter", url));
      pendingBefore.forEach((file) => formData.append("photosBefore", file));
      pendingAfter.forEach((file) => formData.append("photosAfter", file));
      return saveInstallationDraft(formData);
    },
    [photosBefore, photosAfter, pendingBefore, pendingAfter],
  );

  const [state, formAction, isPending] = useActionState<
    SaveInstallationDraftResult | null,
    FormData
  >(submitWithPhotos, null);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/installation" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold">
            {getOrderDisplayNumber(order)}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {order.clientName}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium">Fases da instalação</h2>
        <ol className="mt-4 flex gap-2">
          {PHASES.map((phase, index) => {
            const done = currentPhase > index;
            const active = order.status === phase.key;
            return (
              <li
                key={phase.key}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs",
                  done && "border-primary/30 bg-primary/5 text-primary",
                  active && "border-primary bg-primary/10 font-medium",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4" aria-hidden />
                )}
                {phase.label}
              </li>
            );
          })}
        </ol>
        {order.status === "concluido" && (
          <p className="mt-3 text-center text-sm text-primary">
            Instalação concluída
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium">Cliente e local</h2>
        <div className="mt-3 space-y-2 text-sm">
          {order.clientPhone && (
            <a
              href={`tel:${order.clientPhone.replace(/\D/g, "")}`}
              className="flex items-center gap-2 text-primary underline-offset-2 hover:underline"
            >
              <Phone className="h-4 w-4 shrink-0" />
              {order.clientPhone}
            </a>
          )}
          {order.description && (
            <p className="text-muted-foreground">{order.description}</p>
          )}
        </div>
      </section>

      {state?.success === false && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state?.success && (
        <Alert variant="success">
          <AlertTitle>Salvo</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {order.status !== "concluido" && (
        <form ref={formRef} action={formAction} className="space-y-6">
          <input type="hidden" name="osId" value={order.id} />

          {showPhotos && (
            <>
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <PhotoUpload
                  label="Fotos — antes"
                  hint="Obrigatórias para concluir a instalação final."
                  osId={order.id}
                  scope="installation"
                  existingUrls={photosBefore}
                  mode="form"
                  disabled={isPending}
                  onUrlsChange={setPhotosBefore}
                  onFilesChange={setPendingBefore}
                />
              </section>
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <PhotoUpload
                  label="Fotos — depois"
                  hint="Registre o resultado após a instalação."
                  osId={order.id}
                  scope="installation"
                  existingUrls={photosAfter}
                  mode="form"
                  disabled={isPending}
                  onUrlsChange={setPhotosAfter}
                  onFilesChange={setPendingAfter}
                />
              </section>
            </>
          )}

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <Label htmlFor="notes">Observações da instalação</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Nivelamento, silicone, ajustes, pendências..."
              defaultValue={initial?.notes}
              className="mt-2 min-h-[100px] text-base"
            />
          </section>

          <Button
            type="submit"
            variant="outline"
            className="h-12 w-full text-base"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar registro
              </>
            )}
          </Button>
        </form>
      )}

      {order.status !== "concluido" && (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-medium">Avançar etapa</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Etapas críticas exigem confirmação biométrica do instalador.
          </p>
          <div className="mt-4">
            <StatusWizardAdvance order={order} userRoles={userRoles} />
          </div>
        </section>
      )}
    </div>
  );
}
