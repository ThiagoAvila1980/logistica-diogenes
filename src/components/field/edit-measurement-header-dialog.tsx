"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { updateMeasurementHeader } from "@/actions/field-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { formatBrPhone } from "@/lib/phone-format";

type EditMeasurementHeaderDialogProps = {
  osId: string;
  clientName: string;
  clientPhone: string | null;
  clientAddress: string | null;
  budgetReference: string | null;
};

export function EditMeasurementHeaderDialog({
  osId,
  clientName,
  clientPhone,
  clientAddress,
  budgetReference,
}: EditMeasurementHeaderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(clientName);
  const [phone, setPhone] = useState(clientPhone ?? "");
  const [address, setAddress] = useState(clientAddress ?? "");
  const [budgetRef, setBudgetRef] = useState(budgetReference ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(clientName);
    setPhone(formatBrPhone(clientPhone ?? ""));
    setAddress(clientAddress ?? "");
    setBudgetRef(budgetReference ?? "");
    setError(null);
  }, [open, clientName, clientPhone, clientAddress, budgetReference]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("osId", osId);
    formData.set("clientName", name.trim());
    formData.set("clientPhone", phone.trim());
    formData.set("clientAddress", address.trim());
    formData.set("budgetReference", budgetRef.trim());

    startTransition(async () => {
      const result = await updateMeasurementHeader(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Editar dados do cliente"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!isPending) {
            setOpen(next);
            if (!next) setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar dados do cliente</DialogTitle>
            <DialogDescription>
              Atualize nome, telefone, endereço ou nº do orçamento desta
              medição.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-header-client-name">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-header-client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-header-client-phone">Telefone</Label>
              <PhoneInput
                id="edit-header-client-phone"
                value={phone}
                onValueChange={setPhone}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-header-client-address">Endereço</Label>
              <Textarea
                id="edit-header-client-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Ex.: Rua Exemplo, 123 — Bairro / Cidade-UF"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-header-budget-ref">
                Nº do orçamento (referência)
              </Label>
              <Input
                id="edit-header-budget-ref"
                value={budgetRef}
                onChange={(e) => setBudgetRef(e.target.value)}
                placeholder="Ex.: ORC-2026-0042"
                disabled={isPending}
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
