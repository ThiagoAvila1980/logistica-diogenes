/**
 * Impressão via agente local na rede (Método A).
 * O PC Windows com a impressora USB roda label-print-agent.
 */

const AGENT_URL_KEY = "diogenes.labelPrintAgentUrl";
const AGENT_TOKEN_KEY = "diogenes.labelPrintAgentToken";
const AGENT_PRINTER_KEY = "diogenes.labelPrintAgentPrinter";

export type NetworkPrintResult =
  | { ok: true; printer?: string }
  | {
      ok: false;
      code: "no_agent" | "agent_unreachable" | "print_failed";
      message: string;
    };

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function explainFetchError(err: unknown, agentUrl: string): string {
  const pageHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const agentHttp = agentUrl.startsWith("http://");
  if (pageHttps && agentHttp) {
    return (
      "O site está em HTTPS e o agente em HTTP — o navegador bloqueia (conteúdo misto). " +
      "Abra o Diógenes em http:// (IP local / rede) ou use o app Capacitor para testar o agente."
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/abort|timeout/i.test(msg)) {
    return "Tempo esgotado ao falar com o agente. Confira IP, porta e firewall.";
  }
  return (
    "Não foi possível alcançar o agente. Confira IP, porta, firewall, mesma Wi‑Fi e se o npm start está rodando. " +
    `(${msg || "falha de rede"})`
  );
}

function withTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** URL padrão do .env (opcional) ou localStorage. */
export function getPrintAgentUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(AGENT_URL_KEY)?.trim();
    if (saved) return trimSlash(saved);
  }
  const fromEnv = process.env.NEXT_PUBLIC_LABEL_PRINT_AGENT_URL?.trim();
  return fromEnv ? trimSlash(fromEnv) : "";
}

export function savePrintAgentUrl(url: string): void {
  localStorage.setItem(AGENT_URL_KEY, trimSlash(url.trim()));
}

export function clearPrintAgentUrl(): void {
  localStorage.removeItem(AGENT_URL_KEY);
}

export function getPrintAgentToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AGENT_TOKEN_KEY)?.trim() || "";
}

export function savePrintAgentToken(token: string): void {
  const t = token.trim();
  if (t) localStorage.setItem(AGENT_TOKEN_KEY, t);
  else localStorage.removeItem(AGENT_TOKEN_KEY);
}

export function getPrintAgentPrinter(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AGENT_PRINTER_KEY)?.trim() || "";
}

export function savePrintAgentPrinter(name: string): void {
  const n = name.trim();
  if (n) localStorage.setItem(AGENT_PRINTER_KEY, n);
  else localStorage.removeItem(AGENT_PRINTER_KEY);
}

export function hasPrintAgentConfigured(): boolean {
  return Boolean(getPrintAgentUrl());
}

function agentHeaders(jsonBody = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (jsonBody) headers["Content-Type"] = "application/json";
  const token = getPrintAgentToken();
  if (token) headers["X-Print-Token"] = token;
  return headers;
}

export async function checkPrintAgentHealth(
  baseUrl = getPrintAgentUrl(),
): Promise<{ ok: boolean; message: string }> {
  const url = trimSlash(baseUrl);
  if (!url) {
    return { ok: false, message: "URL do agente não configurada." };
  }
  try {
    const res = await fetch(`${url}/health`, {
      method: "GET",
      cache: "no-store",
      signal: withTimeout(5000),
    });
    if (!res.ok) {
      return { ok: false, message: `Agente respondeu HTTP ${res.status}.` };
    }
    const data = (await res.json()) as { ok?: boolean; service?: string };
    if (!data.ok) {
      return { ok: false, message: "Resposta inesperada do agente." };
    }
    return {
      ok: true,
      message: `Agente online${data.service ? ` (${data.service})` : ""}.`,
    };
  } catch (err) {
    return { ok: false, message: explainFetchError(err, url) };
  }
}

export async function listPrintAgentPrinters(
  baseUrl = getPrintAgentUrl(),
): Promise<string[]> {
  const url = trimSlash(baseUrl);
  if (!url) throw new Error("URL do agente não configurada.");
  try {
    const res = await fetch(`${url}/printers`, {
      headers: agentHeaders(false),
      cache: "no-store",
      signal: withTimeout(8000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        body?.error ?? `Falha ao listar impressoras (${res.status})`,
      );
    }
    const data = (await res.json()) as { printers?: string[] };
    return data.printers ?? [];
  } catch (err) {
    if (err instanceof Error && !/alcançar|HTTPS|Tempo|HTTP/.test(err.message)) {
      throw new Error(explainFetchError(err, url));
    }
    throw err;
  }
}

export async function printRawViaAgent(raw: string): Promise<NetworkPrintResult> {
  const url = getPrintAgentUrl();
  if (!url) {
    return {
      ok: false,
      code: "no_agent",
      message:
        "Configure a URL do agente de impressão (PC Windows com a impressora USB).",
    };
  }

  const printer = getPrintAgentPrinter();
  try {
    const res = await fetch(`${url}/print`, {
      method: "POST",
      headers: agentHeaders(true),
      body: JSON.stringify({
        raw,
        ...(printer ? { printer } : {}),
      }),
      signal: withTimeout(20000),
    });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      printer?: string;
    } | null;
    if (!res.ok || !body?.ok) {
      return {
        ok: false,
        code: "print_failed",
        message: body?.error ?? `Falha na impressão (HTTP ${res.status})`,
      };
    }
    return { ok: true, printer: body.printer };
  } catch (err) {
    return {
      ok: false,
      code: "agent_unreachable",
      message: explainFetchError(err, url),
    };
  }
}
