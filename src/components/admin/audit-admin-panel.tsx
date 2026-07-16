"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

  const currentOs = searchParams.get("os") || "";
  const currentActor = searchParams.get("actorId") || "all";
  const currentAction = searchParams.get("action") || "all";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";
  
  const hasOsFilter = !!currentOs;
  const hasAnyFilter =
    hasOsFilter ||
    currentActor !== "all" ||
    currentAction !== "all" ||
    !!currentFrom ||
    !!currentTo;
  const osCliente =
    data.items.find((i) => i.osNumber && i.cliente)?.cliente ?? null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    params.set("page", "1");

    const os = formData.get("os")?.toString().trim();
    if (os) params.set("os", os);
    else params.delete("os");

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
        <div className="rounded-lg border border-accent bg-accent/20 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>
            Histórico da OS <strong>{currentOs}</strong>
            {osCliente ? (
              <>
                {" "}
                — <span className="text-muted-foreground">{osCliente}</span>
              </>
            ) : null}
          </span>
          <Link
            href={pathname}
            className="text-primary hover:underline flex items-center gap-1 font-medium shrink-0"
            prefetch={false}
          >
            <X className="h-4 w-4" />
            Ver todas as OS
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="os">Nº da OS</Label>
              <Input
                id="os"
                name="os"
                defaultValue={currentOs}
                placeholder="Ex: 12345"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="actorId">Usuário</Label>
              <Select id="actorId" name="actorId" defaultValue={currentActor}>
                <option value="all">Todos os usuários</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action">Ação</Label>
              <Select id="action" name="action" defaultValue={currentAction}>
                <option value="all">Todas as ações</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {getAuditActionLabel(a)}
                  </option>
                ))}
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
                <th className="px-4 py-3 font-medium">Vão</th>
                <th className="px-4 py-3 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {hasAnyFilter
                      ? "Nenhum evento com esses filtros."
                      : "Nenhum evento registrado ainda."}
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.actorName || <span className="italic text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {item.osNumber ? (
                        <Link
                          href={`/admin/auditoria?os=${encodeURIComponent(item.osNumber)}`}
                          className="hover:underline text-primary"
                        >
                          {item.osNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary/20">
                        {getAuditActionLabel(item.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {item.itemId ? (
                        <span title={item.itemId}>
                          {item.itemId.length > 12
                            ? `${item.itemId.slice(0, 8)}…`
                            : item.itemId}
                        </span>
                      ) : item.entityId ? (
                        <span title={`${item.entityType ?? "entidade"}: ${item.entityId}`}>
                          {item.entityType ?? item.entityId.slice(0, 8)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-muted-foreground max-w-[300px] truncate"
                      title={formatAuditPayloadSummary(item.action, item.payload)}
                    >
                      {formatAuditPayloadSummary(item.action, item.payload) || "—"}
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
