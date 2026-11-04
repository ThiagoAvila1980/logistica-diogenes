"use client";

import { useActionState, useCallback, useState } from "react";
import { useRunOnceOnActionSuccess } from "@/hooks/use-run-once-on-action-success";
import { Loader2, Pencil, Plus } from "lucide-react";
import {
  deleteServico,
  saveServico,
  type AdminActionResult,
} from "@/actions/servico-actions";
import { DeleteRecordDialog } from "@/components/admin/delete-record-dialog";
import type { ServicoRow } from "@/lib/data/servicos-db";
import {
  formatReais,
  reaisInputValue,
  SERVICO_ESCOPO_LABEL,
} from "@/lib/servicos/form";
import type { ServicoEscopo } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
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

function ServicoFields({
  idPrefix,
  pending,
  servico,
}: {
  idPrefix: string;
  pending: boolean;
  servico?: ServicoRow;
}) {
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-descricao`}>Descrição</Label>
        <Input
          id={`${idPrefix}-descricao`}
          name="descricao"
          defaultValue={servico?.descricao}
          placeholder="Ex: Veneziana grande (Dom)"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-valor`}>Valor (R$)</Label>
        <Input
          id={`${idPrefix}-valor`}
          name="valor"
          inputMode="decimal"
          defaultValue={reaisInputValue(servico?.valor)}
          placeholder="50,00"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-escopo`}>Onde entra</Label>
        <Select
          id={`${idPrefix}-escopo`}
          name="escopo"
          defaultValue={servico?.escopo ?? "vao"}
          required
          disabled={pending}
        >
          <option value="vao">No vão</option>
          <option value="avulso">Avulso</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-tempo`}>Tempo</Label>
        <Input
          id={`${idPrefix}-tempo`}
          name="tempo"
          defaultValue={servico?.tempo ?? ""}
          placeholder="2 h"
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-meta`}>Meta</Label>
        <Input
          id={`${idPrefix}-meta`}
          name="meta"
          defaultValue={servico?.meta ?? ""}
          placeholder="4 por dia"
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-bonus`}>Bônus (R$)</Label>
        <Input
          id={`${idPrefix}-bonus`}
          name="bonus"
          inputMode="decimal"
          defaultValue={reaisInputValue(servico?.bonus)}
          placeholder="5,00"
          disabled={pending}
        />
      </div>
    </>
  );
}

function servicoDetalhe(servico: ServicoRow): string {
  const parts = [
    servico.tempo,
    servico.meta,
    servico.bonus ? `bônus ${formatReais(servico.bonus)}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function ServicoList({
  title,
  escopo,
  servicos,
  onEdit,
}: {
  title: string;
  escopo: ServicoEscopo;
  servicos: ServicoRow[];
  onEdit: (servico: ServicoRow) => void;
}) {
  const items = servicos.filter((servico) => servico.escopo === escopo);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({items.length})
        </CardTitle>
        <CardDescription>
          {escopo === "vao"
            ? "Entram na medição de cada vão."
            : "Corrida, visita e assistência. Ficam no dia do instalador."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum serviço neste grupo.</p>
        ) : (
          items.map((servico) => {
            const detalhe = servicoDetalhe(servico);
            return (
              <div
                key={servico.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/60 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{servico.descricao}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatReais(servico.valor)}
                    {detalhe ? ` · ${detalhe}` : ""}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {SERVICO_ESCOPO_LABEL[servico.escopo]}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(servico)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <DeleteRecordDialog
                    recordName={servico.descricao}
                    recordDetail={formatReais(servico.valor)}
                    entityLabel="serviço"
                    description="Esta ação é permanente. O serviço será removido do catálogo."
                    onConfirm={() => deleteServico(servico.id)}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function ServicoAdminPanel({ servicos }: { servicos: ServicoRow[] }) {
  const [createState, createAction, createPending] = useActionState<
    AdminActionResult | null,
    FormData
  >(saveServico, null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ServicoRow | null>(null);
  const [editState, editAction, editPending] = useActionState<
    AdminActionResult | null,
    FormData
  >(saveServico, null);
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

  function openEdit(servico: ServicoRow) {
    setEditing(servico);
    setEditFormKey((key) => key + 1);
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo serviço
          </CardTitle>
          <CardDescription>
            Tempo, meta e bônus são opcionais. O bônus só entra quando a meta
            fecha.
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
            className="grid gap-4 sm:grid-cols-2"
          >
            <ServicoFields idPrefix="new" pending={createPending} />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createPending}>
                {createPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ServicoList
        title="No vão"
        escopo="vao"
        servicos={servicos}
        onEdit={openEdit}
      />
      <ServicoList
        title="Avulsos"
        escopo="avulso"
        servicos={servicos}
        onEdit={openEdit}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar serviço</DialogTitle>
          </DialogHeader>
          {editing && (
            <>
              {editState?.success === false && (
                <Alert variant="destructive">
                  <AlertDescription>{editState.message}</AlertDescription>
                </Alert>
              )}
              <form
                key={editFormKey}
                action={editAction}
                className="grid gap-4 sm:grid-cols-2"
              >
                <input type="hidden" name="id" value={editing.id} />
                <ServicoFields
                  idPrefix="edit"
                  pending={editPending}
                  servico={editing}
                />
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={editPending} className="w-full">
                    {editPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
