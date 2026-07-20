/**
 * Orquestra impressão de etiqueta: Método A (rede/agente) primeiro;
 * Método B (Bluetooth nativo) como fallback.
 */

import { printRawViaAgent, hasPrintAgentConfigured } from "@/lib/labels/network-print";
import {
  printLabelRaw as printLabelRawBluetooth,
  type PrintLabelResult as BluetoothPrintResult,
} from "@/lib/labels/bluetooth-print";

export type PrintLabelResult =
  | { ok: true; channel: "network" | "bluetooth"; printer?: string }
  | {
      ok: false;
      code:
        | "no_agent"
        | "agent_unreachable"
        | "print_failed"
        | "not_native"
        | "no_printer";
      message: string;
    };

export async function fetchLabelRaw(
  osId: string,
  itemId: string,
  options?: { preview?: boolean },
): Promise<
  | { ok: true; raw: string; previewDataUrl: string | null }
  | { ok: false; message: string }
> {
  const params = new URLSearchParams({ itemId });
  if (options?.preview) params.set("preview", "1");
  const res = await fetch(
    `/api/labels/${encodeURIComponent(osId)}?${params.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false,
      message: body?.error ?? `Erro ao gerar etiqueta (${res.status})`,
    };
  }
  const data = (await res.json()) as {
    raw?: string;
    previewDataUrl?: string | null;
  };
  if (!data.raw) {
    return { ok: false, message: "Resposta da API sem dados de impressão." };
  }
  return {
    ok: true,
    raw: data.raw,
    previewDataUrl: data.previewDataUrl ?? null,
  };
}

export async function printLabelRaw(raw: string): Promise<PrintLabelResult> {
  if (hasPrintAgentConfigured()) {
    const network = await printRawViaAgent(raw);
    if (network.ok) {
      return { ok: true, channel: "network", printer: network.printer };
    }
    // Se agente configurado mas falhou, não mascara — reporta o erro do agente.
    return {
      ok: false,
      code: network.code,
      message: network.message,
    };
  }

  const bt: BluetoothPrintResult = await printLabelRawBluetooth(raw);
  if (bt.ok) return { ok: true, channel: "bluetooth" };
  return {
    ok: false,
    code: bt.code,
    message: bt.message,
  };
}

export async function fetchAndPrintVaoLabel(
  osId: string,
  itemId: string,
): Promise<PrintLabelResult> {
  const label = await fetchLabelRaw(osId, itemId);
  if (!label.ok) {
    return { ok: false, code: "print_failed", message: label.message };
  }
  return printLabelRaw(label.raw);
}
