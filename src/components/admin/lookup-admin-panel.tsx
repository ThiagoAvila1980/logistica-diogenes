"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminActionResult } from "@/actions/vehicle-actions";
import type { LookupAdminRow } from "@/lib/data/lookup-admin-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LookupAdminPanelProps = {
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  items: LookupAdminRow[];
  saveAction: (
    prev: AdminActionResult | null,
    formData: FormData,
  ) => Promise<AdminActionResult>;
  deleteAction: (id: string) => Promise<AdminActionResult>;
};

export function LookupAdminPanel({
  title,
  description,
  fieldLabel,
  placeholder,
  items,
  saveAction,
  deleteAction,
}: LookupAdminPanelProps) {
  const [createState, createAction, createPending] = useActionState<
    AdminActionResult | null,
    FormData
  >(saveAction, null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<LookupAdminRow | null>(null);
  const [editState, editAction, editPending] = useActionState<
    AdminActionResult | null,
    FormData
  >(saveAction, null);
  const [deletePending, startDelete] = useTransition();
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  function openEdit(item: LookupAdminRow) {
    setEditing(item);
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo registro
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {createState?.success === false && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{createState.message}</AlertDescription>
            </Alert>
          )}
          {createState?.success && (
            <Alert variant="success" className="mb-4">
              <AlertDescription>{createState.message}</AlertDescription>
            </Alert>
          )}
          <form action={createAction} className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="new-descricao">{fieldLabel}</Label>
              <Input
                id="new-descricao"
                name="descricao"
                placeholder={placeholder}
                required
                disabled={createPending}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createPending} className="w-full sm:w-auto">
                {createPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cadastrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {deleteMessage && (
        <Alert variant="destructive">
          <AlertDescription>{deleteMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {title} ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum registro cadastrado.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{item.descricao}</p>
                  {item.usageCount > 0 && (
                    <Badge variant="outline" className="mt-2">
                      Em uso em {item.usageCount} medição(ões)
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deletePending || item.usageCount > 0}
                    onClick={() => {
                      setDeleteMessage(null);
                      startDelete(async () => {
                        const result = await deleteAction(item.id);
                        if (!result.success) setDeleteMessage(result.message);
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar registro</DialogTitle>
          </DialogHeader>
          {editing && (
            <>
              {editState?.success === false && (
                <Alert variant="destructive">
                  <AlertDescription>{editState.message}</AlertDescription>
                </Alert>
              )}
              <form action={editAction} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <div className="space-y-2">
                  <Label htmlFor="edit-descricao">{fieldLabel}</Label>
                  <Input
                    id="edit-descricao"
                    name="descricao"
                    defaultValue={editing.descricao}
                    required
                    disabled={editPending}
                  />
                </div>
                <Button type="submit" disabled={editPending} className="w-full">
                  {editPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
