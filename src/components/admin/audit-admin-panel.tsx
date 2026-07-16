"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuditActionLabel, formatAuditPayloadSummary } from "@/lib/audit/action-labels";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import type { AuditEventListResult } from "@/lib/data/audit-events";

type AuditAdminPanelProps = {
  data: AuditEventListResult;
  users: { id: string; name: string }[];
};

export function AuditAdminPanel({ data, users }: AuditAdminPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentOs = searchParams.get("osNumber") || "";
  const currentActor = searchParams.get("actorId") || "all";
  const currentAction = searchParams.get("action") || "all";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";
  
  const hasOsFilter = !!currentOs;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    params.set("page", "1");

    const osNumber = formData.get("osNumber")?.toString().trim();
    if (osNumber) params.set("osNumber", osNumber);
    else params.delete("osNumber");

    const actorId = formData.get("actorId")?.toString();
    if (actorId && actorId !== "all") params.set("actorId", actorId);
    else params.delete("actorId");

    const action = formData.get("action")?.toString();
    if (action && action !== "all") params.set("action", action);
    else params.delete("action");

    const from = formData.get("from")?.toString();
    if (from) params.set("from", from);
    else params.delete("from");

    const to = formData.get("to")?.toString();
    if (to) params.set("to", to);
    else params.delete("to");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const actions = Object.values(AUDIT_ACTIONS);

  return (
    <div className="space-y-4">
      {hasOsFilter && (
        <div className="rounded-lg border border-accent bg-accent/20 px-4 py-3 text-sm flex items-center justify-between">
          <span>
            Mostrando resultados apenas para OS <strong>{currentOs}</strong>.
          </span>
          <Link
            href={pathname}
            className="text-primary hover:underline flex items-center gap-1 font-medium"
            prefetch={false}
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="osNumber">Nº da OS</Label>
              <Input
                id="osNumber"
                name="osNumber"
                defaultValue={currentOs}
                placeholder="Ex: 12345"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="actorId">Usuário</Label>
              <Select name="actorId" defaultValue={currentActor}>
                <SelectTrigger id="actorId">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action">Ação</Label>
              <Select name="action" defaultValue={currentAction}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {getAuditActionLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="from">Data inicial</Label>
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={currentFrom}
              />
            </div>

            <div className="space-y-1.5 flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="to">Data final</Label>
                <Input
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={currentTo}
                />
              </div>
              <Button type="submit" disabled={isPending} className="mb-0" aria-label="Filtrar">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-primary/10 bg-card shadow-(--shadow-card) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Data/Hora</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">OS</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum registro encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.actorName || <span className="italic text-muted-foreground">Sistema</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {item.osNumber ? (
                        <Link 
                          href={`/admin/auditoria?osNumber=${item.osNumber}`}
                          className="hover:underline text-primary"
                        >
                          {item.osNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary/20">
                        {getAuditActionLabel(item.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {item.entityId ? (
                        <span title={`${item.entityType || 'Entidade'}: ${item.entityId}`}>
                          {item.entityId.slice(0, 8)}...
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[300px] truncate" title={formatAuditPayloadSummary(item.action, item.payload)}>
                      {formatAuditPayloadSummary(item.action, item.payload) || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.total > data.pageSize && (
          <div className="flex items-center justify-between border-t border-primary/10 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Mostrando {(data.page - 1) * data.pageSize + 1} até{" "}
              {Math.min(data.page * data.pageSize, data.total)} de {data.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1 || isPending}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(data.page - 1));
                  startTransition(() => {
                    router.push(`${pathname}?${params.toString()}`);
                  });
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page * data.pageSize >= data.total || isPending}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(data.page + 1));
                  startTransition(() => {
                    router.push(`${pathname}?${params.toString()}`);
                  });
                }}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
