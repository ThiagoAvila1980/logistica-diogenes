"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import { savePedidoAction } from "@/actions/pedido-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateInput } from "@/components/ui/date-input";
import { formatBrDate, formatBrDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type { PedidoDetail } from "@/lib/data/pedidos";

type PedidoManageFormProps = {
  osId: string;
  pedido: PedidoDetail;
  canEdit: boolean;
};

function toTimeString(date: Date | null | undefined): string {
  if (!date) return "";
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function PedidoManageForm({ osId, pedido, canEdit }: PedidoManageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [feitoChecked, setFeitoChecked] = useState(pedido.pedidoFeito);
  const [feitoData, setFeitoData] = useState(formatBrDate(pedido.pedidoFeitoAt));
  const [feitoHora, setFeitoHora] = useState(toTimeString(pedido.pedidoFeitoAt));

  const [recebidoChecked, setRecebidoChecked] = useState(pedido.pedidoRecebido);
  const [recebidoData, setRecebidoData] = useState(formatBrDate(pedido.pedidoRecebidoAt));
  const [recebidoHora, setRecebidoHora] = useState(toTimeString(pedido.pedidoRecebidoAt));

  // Ao desmarcar "Pedido Feito", limpar "Pedido Recebido"
  useEffect(() => {
    if (!feitoChecked) {
      setRecebidoChecked(false);
      setRecebidoData("");
      setRecebidoHora("");
    }
  }, [feitoChecked]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    // Radix Checkbox usa <button> internamente — sempre definir explicitamente
    formData.set("pedidoFeito", feitoChecked ? "on" : "off");
    formData.set("pedidoRecebido", recebidoChecked ? "on" : "off");

    startTransition(async () => {
      const result = await savePedidoAction(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Seção: Pedido Feito ── */}
      <div
        className={cn(
          "rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card) space-y-4",
          feitoChecked && "border-brass-border/60",
        )}
      >
        <div className="flex items-center gap-3">
          <Checkbox
            id="pedidoFeito"
            name="pedidoFeito"
            value="on"
            checked={feitoChecked}
            onCheckedChange={(v) => setFeitoChecked(Boolean(v))}
            disabled={!canEdit || isPending}
            className="h-5 w-5"
          />
          <Label
            htmlFor="pedidoFeito"
            className={cn(
              "cursor-pointer text-base font-semibold",
              !canEdit && "cursor-default",
            )}
          >
            Pedido Feito
          </Label>
        </div>

        {feitoChecked && (
          <div className="space-y-3 pl-8">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="pedidoFeitoData" className="text-sm">
                  Data <span className="text-destructive">*</span>
                </Label>
                <DateInput
                  id="pedidoFeitoData"
                  name="pedidoFeitoData"
                  value={feitoData}
                  onValueChange={setFeitoData}
                  disabled={!canEdit || isPending}
                  className="h-10"
                />
              </div>
              <div className="w-32 space-y-1.5">
                <Label htmlFor="pedidoFeitoHora" className="text-sm">
                  Horário <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pedidoFeitoHora"
                  name="pedidoFeitoHora"
                  type="time"
                  value={feitoHora}
                  onChange={(e) => setFeitoHora(e.target.value)}
                  disabled={!canEdit || isPending}
                  className="h-10"
                />
              </div>
            </div>

            {pedido.pedidoFeitoPor && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                Registrado por{" "}
                <span className="font-medium text-foreground">
                  {pedido.pedidoFeitoPor.name}
                </span>
                {pedido.pedidoFeitoAt && (
                  <> em {formatBrDateTime(pedido.pedidoFeitoAt)}</>
                )}
              </p>
            )}
          </div>
        )}

        {!feitoChecked && pedido.pedidoFeito && (
          <p className="pl-8 text-xs text-muted-foreground">
            Pedido marcado anteriormente. Desmarque para remover o registro.
          </p>
        )}
      </div>

      {/* ── Seção: Pedido Recebido ── */}
      <div
        className={cn(
          "rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card) space-y-4",
          recebidoChecked && "border-success-foreground/30",
          !feitoChecked && "opacity-50",
        )}
      >
        <div className="flex items-center gap-3">
          <Checkbox
            id="pedidoRecebido"
            name="pedidoRecebido"
            value="on"
            checked={recebidoChecked}
            onCheckedChange={(v) => setRecebidoChecked(Boolean(v))}
            disabled={!canEdit || !feitoChecked || isPending}
            className="h-5 w-5"
          />
          <Label
            htmlFor="pedidoRecebido"
            className={cn(
              "cursor-pointer text-base font-semibold",
              (!canEdit || !feitoChecked) && "cursor-default",
            )}
          >
            Pedido Recebido
          </Label>
          {!feitoChecked && (
            <span className="text-xs text-muted-foreground">
              (requer Pedido Feito)
            </span>
          )}
        </div>

        {recebidoChecked && (
          <div className="space-y-3 pl-8">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="pedidoRecebidoData" className="text-sm">
                  Data <span className="text-destructive">*</span>
                </Label>
                <DateInput
                  id="pedidoRecebidoData"
                  name="pedidoRecebidoData"
                  value={recebidoData}
                  onValueChange={setRecebidoData}
                  disabled={!canEdit || isPending}
                  className="h-10"
                />
              </div>
              <div className="w-32 space-y-1.5">
                <Label htmlFor="pedidoRecebidoHora" className="text-sm">
                  Horário <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pedidoRecebidoHora"
                  name="pedidoRecebidoHora"
                  type="time"
                  value={recebidoHora}
                  onChange={(e) => setRecebidoHora(e.target.value)}
                  disabled={!canEdit || isPending}
                  className="h-10"
                />
              </div>
            </div>

            {pedido.pedidoRecebidoPor && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                Registrado por{" "}
                <span className="font-medium text-foreground">
                  {pedido.pedidoRecebidoPor.name}
                </span>
                {pedido.pedidoRecebidoAt && (
                  <> em {formatBrDateTime(pedido.pedidoRecebidoAt)}</>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Campo oculto com o osId */}
      <input type="hidden" name="osId" value={osId} />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription className="text-success-foreground">
            Pedido salvo com sucesso.
          </AlertDescription>
        </Alert>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} className="min-w-[120px]">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
