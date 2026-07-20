/**
 * Abstração de impressão Bluetooth SPP (Método B).
 * No app Capacitor usa @kduma-autoid/capacitor-bluetooth-printer.
 * No browser web puro informa que é necessário o app nativo.
 */

import { Capacitor } from "@capacitor/core";

const PRINTER_ADDRESS_KEY = "diogenes.labelPrinterAddress";
const PRINTER_NAME_KEY = "diogenes.labelPrinterName";

export type BluetoothPrinterDevice = {
  name: string;
  address: string;
};

export type PrintLabelResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_native" | "no_printer" | "print_failed";
      message: string;
    };

async function getBluetoothPrinter() {
  const mod = await import("@kduma-autoid/capacitor-bluetooth-printer");
  return mod.BluetoothPrinter;
}

export function isLabelPrintAvailable(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function getSavedPrinter(): BluetoothPrinterDevice | null {
  if (typeof window === "undefined") return null;
  const address = localStorage.getItem(PRINTER_ADDRESS_KEY);
  if (!address) return null;
  return {
    address,
    name: localStorage.getItem(PRINTER_NAME_KEY) || address,
  };
}

export function savePrinter(device: BluetoothPrinterDevice): void {
  localStorage.setItem(PRINTER_ADDRESS_KEY, device.address);
  localStorage.setItem(PRINTER_NAME_KEY, device.name);
}

export function clearSavedPrinter(): void {
  localStorage.removeItem(PRINTER_ADDRESS_KEY);
  localStorage.removeItem(PRINTER_NAME_KEY);
}

export async function listBluetoothPrinters(): Promise<BluetoothPrinterDevice[]> {
  if (!isLabelPrintAvailable()) {
    throw new Error("Listagem Bluetooth só está disponível no app Android.");
  }
  const BluetoothPrinter = await getBluetoothPrinter();
  const result = await BluetoothPrinter.list();
  return (result.devices ?? []).map((d) => ({
    name: d.name?.trim() || d.address,
    address: d.address,
  }));
}

export async function printLabelRaw(raw: string): Promise<PrintLabelResult> {
  if (!isLabelPrintAvailable()) {
    return {
      ok: false,
      code: "not_native",
      message:
        "A impressão Bluetooth funciona no app Android Diógenes. Abra pelo app instalado no celular.",
    };
  }

  const saved = getSavedPrinter();
  if (!saved) {
    return {
      ok: false,
      code: "no_printer",
      message:
        "Nenhuma impressora pareada. Escolha a POS-9220-L nas configurações de etiqueta.",
    };
  }

  try {
    const BluetoothPrinter = await getBluetoothPrinter();
    await BluetoothPrinter.connectAndPrint({
      address: saved.address,
      data: raw,
    });
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao enviar para a impressora.";
    return { ok: false, code: "print_failed", message };
  }
}

/** @deprecated Use `@/lib/labels/print-label` (Método A rede + fallback BT). */
export async function fetchAndPrintVaoLabel(osId: string, itemId: string) {
  const { fetchAndPrintVaoLabel: print } = await import("@/lib/labels/print-label");
  return print(osId, itemId);
}
