"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clearStoredRoute } from "@/lib/navigation/masked-url";
import { cn } from "@/lib/utils";

const LOGOUT_URL = "/api/auth/logout";

export function LogoutButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function handleConfirmLogout() {
    setPending(true);
    clearStoredRoute();
    // window.location garante navegação completa — evita que o fetch
    // do Next.js intercepte e deixe o modal preso com pending=true.
    window.location.href = LOGOUT_URL;
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("w-full justify-start gap-2 px-2", className)}
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        Sair
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!pending) setOpen(nextOpen);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sair do sistema</DialogTitle>
            <DialogDescription>
              Deseja encerrar sua sessão? Você precisará fazer login novamente
              para continuar.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmLogout}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saindo…
                </>
              ) : (
                "Sair"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
