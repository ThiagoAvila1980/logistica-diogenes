"use client";

import { useActionState, useTransition } from "react";
import { Lock, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { saveRoleAccessMatrix } from "@/actions/role-access-actions";
import type { RoleAccessActionResult } from "@/actions/role-access-actions";
import { SCREENS, type ScreenKey } from "@/lib/auth/screens";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { UserRole } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const CONFIGURABLE_ROLES: Exclude<UserRole, "admin">[] = [
  "gerente",
  "medidor",
  "cortador",
  "motorista",
  "instalador",
];

type RoleMatrix = Record<Exclude<UserRole, "admin">, Record<ScreenKey, boolean>>;

function Checkbox({
  name,
  defaultChecked,
  disabled,
}: {
  name: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        name={name}
        value="on"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="h-4 w-4 rounded border border-input accent-primary disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  );
}

export function RoleAccessPanel({ initialMatrix }: { initialMatrix: RoleMatrix }) {
  const [result, action, isPending] = useActionState<
    RoleAccessActionResult | null,
    FormData
  >(async (_prev, formData) => {
    return saveRoleAccessMatrix(formData);
  }, null);

  return (
    <div className="space-y-6">
      {result?.success === true && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Permissões salvas com sucesso.</AlertDescription>
        </Alert>
      )}
      {result?.success === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <form action={action}>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Papel
                </th>
                {SCREENS.map((screen) => (
                  <th
                    key={screen.key}
                    className="px-3 py-3 text-center font-semibold text-foreground"
                  >
                    {screen.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Linha do admin — travada */}
              <tr className="bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {ROLE_LABELS["admin"]}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <Lock className="h-3 w-3" />
                      Acesso total
                    </span>
                  </div>
                </td>
                {SCREENS.map((screen) => (
                  <td key={screen.key} className="px-3 py-3 text-center">
                    <Checkbox
                      name={`admin:${screen.key}`}
                      defaultChecked={true}
                      disabled={true}
                    />
                  </td>
                ))}
              </tr>

              {/* Linhas dos papéis configuráveis */}
              {CONFIGURABLE_ROLES.map((role) => (
                <tr
                  key={role}
                  className={cn(
                    "transition-colors hover:bg-muted/20",
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {ROLE_LABELS[role]}
                  </td>
                  {SCREENS.map((screen) => (
                    <td key={screen.key} className="px-3 py-3 text-center">
                      <Checkbox
                        name={`${role}:${screen.key}`}
                        defaultChecked={initialMatrix[role]?.[screen.key] ?? false}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Alterações entram em vigor em até 30 segundos para usuários já logados.
          </p>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar permissões
          </Button>
        </div>
      </form>
    </div>
  );
}
