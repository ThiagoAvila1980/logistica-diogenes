"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteUser } from "@/actions/user-admin-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteUserDialogProps = {
  userId: string;
  userName: string;
  userEmail: string;
  disabled?: boolean;
};

export function DeleteUserDialog({
  userId,
  userName,
  userEmail,
  disabled,
}: DeleteUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(userId);
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
        variant="outline"
        size="sm"
        className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={disabled || isPending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" />
        Excluir
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
            <DialogTitle>Excluir usuário?</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. O usuário será removido do sistema, junto
              com notificações e vínculos de atribuição (medições, transporte e
              instalação ficarão sem responsável).
            </DialogDescription>
          </DialogHeader>

          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-medium">{userName}</span>
            <span className="block text-muted-foreground">{userEmail}</span>
          </p>

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
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir permanentemente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
