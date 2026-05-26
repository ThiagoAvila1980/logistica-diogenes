"use client";

import { useRef, useState } from "react";
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

const LOGOUT_URL = "/api/auth/logout";

export function LogoutButton() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function handleConfirmLogout() {
    setPending(true);
    clearStoredRoute();
    formRef.current?.submit();
  }

  return (
    <>
      <form ref={formRef} method="POST" action={LOGOUT_URL} className="hidden" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 px-2"
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
