"use client";

import { useActionState, useCallback, useState } from "react";
import { useRunOnceOnActionSuccess } from "@/hooks/use-run-once-on-action-success";
import { Loader2, Pencil, Plus } from "lucide-react";
import {
  deleteVehicle,
  saveVehicle,
  type AdminActionResult,
} from "@/actions/vehicle-actions";
import { DeleteRecordDialog } from "@/components/admin/delete-record-dialog";
import type { VehicleRow } from "@/lib/data/vehicles-db";
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

export function VehicleAdminPanel({ vehicles }: { vehicles: VehicleRow[] }) {
  const [createState, createAction, createPending] = useActionState<
    AdminActionResult | null,
    FormData
  >(saveVehicle, null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [editState, editAction, editPending] = useActionState<
    AdminActionResult | null,
    FormData
  >(saveVehicle, null);
  const [createFormKey, setCreateFormKey] = useState(0);

  const onCreateSuccess = useCallback(() => {
    setCreateFormKey((key) => key + 1);
  }, []);

  const onEditSuccess = useCallback(() => {
    setEditOpen(false);
  }, []);

  useRunOnceOnActionSuccess(createState, onCreateSuccess);
  useRunOnceOnActionSuccess(editState, onEditSuccess);

  function openEdit(vehicle: VehicleRow) {
    setEditing(vehicle);
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo veículo
          </CardTitle>
          <CardDescription>Cadastre descrição e placa do veículo.</CardDescription>
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-description">Descrição</Label>
              <Input
                id="new-description"
                name="description"
                placeholder="Ex: Fiorino — carga leve"
                required
                disabled={createPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-plate">Placa</Label>
              <Input
                id="new-plate"
                name="plate"
                placeholder="ABC1D23"
                required
                disabled={createPending}
                className="uppercase"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createPending} className="w-full">
                {createPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cadastrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frota ({vehicles.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum veículo cadastrado.
            </p>
          ) : (
            vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/60 p-4"
              >
                <div>
                  <p className="font-medium">{vehicle.description}</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {vehicle.plate}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={vehicle.active ? "default" : "secondary"}>
                      {vehicle.active ? "Ativo" : "Inativo"}
                    </Badge>
                    {vehicle.inUse && (
                      <Badge variant="outline">Em transporte</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(vehicle)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <DeleteRecordDialog
                    recordName={vehicle.description}
                    recordDetail={vehicle.plate}
                    entityLabel="veículo"
                    description="Esta ação é permanente. O veículo será removido da frota."
                    disabled={vehicle.inUse}
                    onConfirm={() => deleteVehicle(vehicle.id)}
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
            <DialogTitle>Editar veículo</DialogTitle>
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
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Input
                    id="edit-description"
                    name="description"
                    defaultValue={editing.description}
                    required
                    disabled={editPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plate">Placa</Label>
                  <Input
                    id="edit-plate"
                    name="plate"
                    defaultValue={editing.plate}
                    required
                    disabled={editPending}
                    className="uppercase"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-active"
                    name="active"
                    value="true"
                    defaultChecked={editing.active}
                    disabled={editPending || editing.inUse}
                    className="h-4 w-4 rounded border"
                  />
                  <Label htmlFor="edit-active">Ativo</Label>
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
