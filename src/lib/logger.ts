/**
 * Logger estruturado mínimo (JSON em linha única).
 *
 * Centraliza a saída de logs para facilitar a futura integração com um
 * coletor (Sentry, Datadog, Axiom, etc.) — basta plugar o envio no método
 * `error` sem tocar nos call sites.
 *
 * Erros são serializados de forma segura (mensagem + stack), evitando
 * `[object Object]` nos logs.
 */

type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function normalizeMeta(meta?: LogMeta): LogMeta | undefined {
  if (!meta) return undefined;
  const out: LogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = key === "err" || key === "error" ? serializeError(value) : value;
  }
  return out;
}

function emit(level: LogLevel, message: string, meta?: LogMeta): void {
  const entry = {
    level,
    message,
    ...normalizeMeta(meta),
    ts: new Date().toISOString(),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    // Ponto de integração para rastreamento de erros (ex.: Sentry.captureException).
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => emit("info", message, meta),
  warn: (message: string, meta?: LogMeta) => emit("warn", message, meta),
  error: (message: string, meta?: LogMeta) => emit("error", message, meta),
};
