"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import {
  createUser,
  updateUser,
} from "@/actions/user-admin-actions";
import type { AdminActionResult } from "@/actions/vehicle-actions";
import type { AdminUserRow } from "@/lib/data/users-admin";
import {
  ALL_USER_ROLES,
  ROLE_LABELS,
  formatRolesLabel,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function RoleMultiSelect({
  name,
  defaultRoles,
  disabled,
}: {
  name: string;
  defaultRoles?: readonly UserRole[];
  disabled?: boolean;
}) {
  const selected = new Set(defaultRoles ?? []);

  return (
    <fieldset
      disabled={disabled}
      className="grid gap-2 rounded-md border border-input p-3 sm:grid-cols-2"
    >
      <legend className="sr-only">Papéis</legend>
      {ALL_USER_ROLES.map((role) => (
        <label
          key={role}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type="checkbox"
            name={name}
            value={role}
            defaultChecked={selected.has(role)}
            disabled={disabled}
            className="h-4 w-4 rounded border"
          />
          {ROLE_LABELS[role]}
        </label>
      ))}
    </fieldset>
  );
}

export function UserAdminPanel({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState<
    AdminActionResult | null,
    FormData
  >(createUser, null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [editState, editAction, editPending] = useActionState<
    AdminActionResult | null,
    FormData
  >(updateUser, null);

  useEffect(() => {
    if (createState?.success) {
      setCreateOpen(false);
      router.refresh();
    }
  }, [createState, router]);

  useEffect(() => {
    if (editState?.success) {
      setEditOpen(false);
      router.refresh();
    }
  }, [editState, router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Equipe ({users.length})</CardTitle>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Criar usuário
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  ))}
                  <Badge variant={user.active ? "default" : "outline"}>
                    {user.active ? "Ativo" : "Inativo"}
                  </Badge>
                  {user.id === currentUserId && (
                    <Badge variant="outline">Você</Badge>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(user);
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          {createState?.success === false && (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{createState.message}</AlertDescription>
            </Alert>
          )}
          {createState?.success && (
            <Alert variant="success">
              <AlertDescription>{createState.message}</AlertDescription>
            </Alert>
          )}
          <form action={createAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome</Label>
              <Input id="new-name" name="name" required disabled={createPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">E-mail</Label>
              <Input
                id="new-email"
                name="email"
                type="email"
                required
                disabled={createPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Papéis</Label>
              <RoleMultiSelect name="roles" disabled={createPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Telefone</Label>
              <Input id="new-phone" name="phone" disabled={createPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha inicial</Label>
              <Input
                id="new-password"
                name="password"
                type="password"
                minLength={6}
                required
                disabled={createPending}
              />
            </div>
            <Button type="submit" disabled={createPending} className="w-full">
              {createPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Criar usuário
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
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
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editing.name}
                    required
                    disabled={editPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">E-mail</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={editing.email}
                    required
                    disabled={editPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Papéis</Label>
                  <RoleMultiSelect
                    name="roles"
                    defaultRoles={editing.roles}
                    disabled={editPending || editing.id === currentUserId}
                  />
                  {editing.id === currentUserId && (
                    <p className="text-xs text-muted-foreground">
                      Atual: {formatRolesLabel(editing.roles)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    defaultValue={editing.phone ?? ""}
                    disabled={editPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Nova senha (opcional)</Label>
                  <Input
                    id="edit-password"
                    name="password"
                    type="password"
                    minLength={6}
                    placeholder="Deixe em branco para manter"
                    disabled={editPending}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-active-user"
                    name="active"
                    value="true"
                    defaultChecked={editing.active}
                    disabled={editPending || editing.id === currentUserId}
                    className="h-4 w-4 rounded border"
                  />
                  <Label htmlFor="edit-active-user">Ativo</Label>
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
