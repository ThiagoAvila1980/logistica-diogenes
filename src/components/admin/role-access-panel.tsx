"use client";

import { useActionState, useEffect, useState } from "react";
import { Lock, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { saveRoleAccessMatrix } from "@/actions/role-access-actions";
import type { RoleAccessActionResult } from "@/actions/role-access-actions";
import { useRunOnceOnActionSuccess } from "@/hooks/use-run-once-on-action-success";
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

function cloneMatrix(source: RoleMatrix): RoleMatrix {
  return CONFIGURABLE_ROLES.reduce((acc, role) => {
    acc[role] = { ...source[role] };
    return acc;
  }, {} as RoleMatrix);
}

function MatrixCheckbox({
  name,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        name={name}
        value="on"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="h-4 w-4 rounded border border-input accent-primary disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  );
}

export function RoleAccessPanel({ initialMatrix }: { initialMatrix: RoleMatrix }) {
  const [matrix, setMatrix] = useState<RoleMatrix>(() => cloneMatrix(initialMatrix));
  const [result, action, isPending] = useActionState<
    RoleAccessActionResult | null,
    FormData
  >(async (_prev, formData) => {
    return saveRoleAccessMatrix(formData);
  }, null);

  useEffect(() => {
    setMatrix(cloneMatrix(initialMatrix));
  }, [initialMatrix]);

  useRunOnceOnActionSuccess(result, () => {});

  function toggleCell(role: Exclude<UserRole, "admin">, screenKey: ScreenKey) {
    setMatrix((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [screenKey]: !current[role][screenKey],
      },
    }));
  }

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
                    <MatrixCheckbox
                      name={`admin:${screen.key}`}
                      checked={true}
                      disabled={true}
                    />
                  </td>
                ))}
              </tr>

              {CONFIGURABLE_ROLES.map((role) => (
                <tr
                  key={role}
                  className={cn("transition-colors hover:bg-muted/20")}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {ROLE_LABELS[role]}
                  </td>
                  {SCREENS.map((screen) => (
                    <td key={screen.key} className="px-3 py-3 text-center">
                      <MatrixCheckbox
                        name={`${role}:${screen.key}`}
                        checked={matrix[role]?.[screen.key] ?? false}
                        onChange={() => toggleCell(role, screen.key)}
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
