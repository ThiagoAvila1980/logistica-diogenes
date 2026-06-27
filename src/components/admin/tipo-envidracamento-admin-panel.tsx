"use client";

import { useActionState, useCallback, useState } from "react";
import { useRunOnceOnActionSuccess } from "@/hooks/use-run-once-on-action-success";
import { Loader2, Pencil, Plus } from "lucide-react";
import type { AdminActionResult } from "@/actions/vehicle-actions";
import type { LookupAdminRow } from "@/lib/data/lookup-admin-db";
import { DeleteRecordDialog } from "@/components/admin/delete-record-dialog";
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
import { CatalogImageUpload } from "@/components/ui/catalog-image-upload";
import { ResolvedImage } from "@/components/ui/resolved-image";

type TipoEnvidracamentoAdminPanelProps = {
  items: LookupAdminRow[];
  saveAction: (
    prev: AdminActionResult | null,
    formData: FormData,
  ) => Promise<AdminActionResult>;
  deleteAction: (id: string) => Promise<AdminActionResult>;
};

export function TipoEnvidracamentoAdminPanel({
  items,
  saveAction,
  deleteAction,
}: TipoEnvidracamentoAdminPanelProps) {
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
  const [createFormKey, setCreateFormKey] = useState(0);
  const [editFormKey, setEditFormKey] = useState(0);

  const onCreateSuccess = useCallback(() => {
    setCreateFormKey((key) => key + 1);
  }, []);

  const onEditSuccess = useCallback(() => {
    setEditOpen(false);
    setEditFormKey((key) => key + 1);
  }, []);

  useRunOnceOnActionSuccess(createState, onCreateSuccess);
  useRunOnceOnActionSuccess(editState, onEditSuccess);

  function openEdit(item: LookupAdminRow) {
    setEditing(item);
    setEditFormKey((key) => key + 1);
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
          <CardDescription>
            Informe a descrição, a dificuldade e, se desejar, envie uma imagem de
            referência do sistema.
          </CardDescription>
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
          <form
            key={createFormKey}
            action={createAction}
            className="grid gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="new-descricao">Descrição</Label>
              <Input
                id="new-descricao"
                name="descricao"
                placeholder="Ex: Correr, Pivotante, Fixo"
                required
                disabled={createPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-dificuldade">Dificuldade</Label>
              <Input
                id="new-dificuldade"
                name="dificuldade"
                type="number"
                min={1}
                max={99}
                defaultValue={1}
                required
                disabled={createPending}
              />
              <p className="text-xs text-muted-foreground">
                Multiplicador de pontuação por vão (ex.: box=1, sacada=3).
              </p>
            </div>
            <CatalogImageUpload disabled={createPending} />
            <Button type="submit" disabled={createPending} className="w-full sm:w-auto">
              {createPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cadastrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos cadastrados ({items.length})</CardTitle>
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
                className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/60 p-4"
              >
                {item.imagemUrl ? (
                  <ResolvedImage
                    src={item.imagemUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed bg-muted/30 text-xs text-muted-foreground"
                    aria-hidden
                  >
                    Sem foto
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.descricao}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      Dificuldade {item.dificuldade ?? 1}
                    </Badge>
                    {item.usageCount > 0 && (
                      <Badge variant="outline">
                        Em uso em {item.usageCount} medição(ões)
                      </Badge>
                    )}
                  </div>
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
                  <DeleteRecordDialog
                    recordName={item.descricao}
                    entityLabel="tipo de envidraçamento"
                    description="Esta ação é permanente. O tipo de envidraçamento será removido do catálogo, incluindo a imagem de referência."
                    disabled={item.usageCount > 0}
                    onConfirm={() => deleteAction(item.id)}
                  />
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
              <form
                key={`${editing.id}-${editFormKey}`}
                action={editAction}
                className="space-y-4"
              >
                <input type="hidden" name="id" value={editing.id} />
                <div className="space-y-2">
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Input
                    id="edit-descricao"
                    name="descricao"
                    defaultValue={editing.descricao}
                    required
                    disabled={editPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dificuldade">Dificuldade</Label>
                  <Input
                    id="edit-dificuldade"
                    name="dificuldade"
                    type="number"
                    min={1}
                    max={99}
                    defaultValue={editing.dificuldade ?? 1}
                    required
                    disabled={editPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Multiplicador de pontuação por vão (ex.: box=1, sacada=3).
                  </p>
                </div>
                <CatalogImageUpload
                  existingUrl={editing.imagemUrl}
                  disabled={editPending}
                />
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
