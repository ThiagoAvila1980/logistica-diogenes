"use client";

import { useCallback, useState } from "react";
import {
  ChevronDown,
  FileText,
  Layers,
  Loader2,
  Printer,
  SearchX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { VaoOption } from "@/lib/measurement/vao-item-subtitle";

type PrintMeasurementMenuProps = {
  osId: string;
  className?: string;
};

type LoadState = "idle" | "loading" | "error";

export function PrintMeasurementMenu({
  osId,
  className,
}: PrintMeasurementMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [vaos, setVaos] = useState<VaoOption[]>([]);
  const [search, setSearch] = useState("");

  const openFullPdf = useCallback(() => {
    window.open(`/api/measurements/${osId}/pdf`, "_blank", "noopener");
  }, [osId]);

  const openVaoPdf = useCallback(
    (itemId: string) => {
      window.open(
        `/api/measurements/${osId}/pdf?itemIds=${encodeURIComponent(itemId)}`,
        "_blank",
        "noopener",
      );
      setDialogOpen(false);
    },
    [osId],
  );

  const openVaoDialog = useCallback(async () => {
    setDialogOpen(true);
    setSearch("");
    setLoadState("loading");
    try {
      const res = await fetch(`/api/measurements/${osId}/vaos`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Falha ao carregar vãos");
      const data = (await res.json()) as { vaos: VaoOption[] };
      setVaos(data.vaos);
      setLoadState("idle");
    } catch {
      setLoadState("error");
    }
  }, [osId]);

  const filteredVaos = search.trim()
    ? vaos.filter((v) =>
        `vão ${v.vaoNumber} ${v.label}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : vaos;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary",
              className,
            )}
            aria-label="Opções de impressão da medição"
            title="Imprimir medição"
            onClickCapture={(e) => e.stopPropagation()}
          >
            <span
              className="flex h-7 w-9 flex-col items-center justify-center rounded border border-current bg-background/80 leading-none"
              aria-hidden
            >
              <span className="mt-0.5 text-[9px] font-bold tracking-tight">
                PDF
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={openFullPdf}>
            <FileText className="h-4 w-4" />
            Imprimir Completo
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void openVaoDialog();
            }}
          >
            <Layers className="h-4 w-4" />
            Imprimir por Vão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSearch("");
        }}
      >
        <DialogContent
          className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="border-b px-5 pb-4 pt-5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Printer className="h-4 w-4 text-primary" />
              Imprimir por Vão
            </DialogTitle>
            <DialogDescription>
              Selecione o vão para gerar o PDF individual.
            </DialogDescription>
          </DialogHeader>

          {loadState !== "error" && vaos.length > 0 && (
            <div className="border-b px-5 py-3">
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar vão, ambiente..."
                className="h-11"
              />
            </div>
          )}

          <div className="min-h-[220px] flex-1 overflow-y-auto px-3 py-3">
            {loadState === "loading" && (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Carregando vãos...</p>
              </div>
            )}

            {loadState === "error" && (
              <div className="px-2 py-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    Não foi possível carregar os vãos desta medição. Tente
                    novamente.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {loadState === "idle" && vaos.length === 0 && (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <SearchX className="h-6 w-6" />
                <p className="text-sm">
                  Nenhum vão registrado nesta medição ainda.
                </p>
              </div>
            )}

            {loadState === "idle" &&
              vaos.length > 0 &&
              filteredVaos.length === 0 && (
                <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <SearchX className="h-6 w-6" />
                  <p className="text-sm">Nenhum vão encontrado para "{search}".</p>
                </div>
              )}

            {loadState === "idle" && filteredVaos.length > 0 && (
              <ul className="space-y-1.5">
                {filteredVaos.map((vao) => (
                  <li key={vao.id}>
                    <button
                      type="button"
                      onClick={() => openVaoPdf(vao.id)}
                      className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-transparent bg-muted/30 px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 active:scale-[0.99]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {vao.vaoNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          Vão {vao.vaoNumber}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {vao.label}
                        </span>
                      </span>
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
