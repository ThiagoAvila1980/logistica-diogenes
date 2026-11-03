export const BACKUP_TIME_ZONE = "America/Sao_Paulo";
export const DAILY_BACKUP_HOUR = 20;
export const BACKUP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const BACKUP_KEY_PREFIX = "backups/";

export type BackupKind = "corte" | "diario";

export type BackupObject = {
  key: string;
  lastModified: Date;
};

export type BackupEnv = {
  nodeEnv?: string;
  backupEnabled?: string;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  databaseUrl?: string;
  directUrl?: string;
};

export type BackupConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  databaseUrl: string;
};

type SaoPauloParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function saoPauloParts(now: Date): SaoPauloParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BACKUP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const hour = Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function formatSaoPauloDay(now: Date): string {
  const parts = saoPauloParts(now);
  return `${parts.year}${pad(parts.month)}${pad(parts.day)}`;
}

export function backupObjectKey(kind: BackupKind, now: Date): string {
  const parts = saoPauloParts(now);
  const stamp = [
    formatSaoPauloDay(now),
    `${pad(parts.hour)}${pad(parts.minute)}${pad(parts.second)}`,
  ].join("-");
  return `${BACKUP_KEY_PREFIX}db_logistica-${stamp}-${kind}.sql`;
}

export function databaseHost(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export type PgDumpTarget = {
  args: string[];
  password: string;
};

/** Host e porta separados. O pg_dump do Debian ignora a URL e cai no socket local. */
export function pgDumpTarget(databaseUrl: string): PgDumpTarget | null {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    return null;
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!url.hostname || !database) return null;

  return {
    args: [
      "--host",
      url.hostname,
      "--port",
      url.port || "5432",
      "--username",
      decodeURIComponent(url.username),
      "--dbname",
      database,
    ],
    password: decodeURIComponent(url.password),
  };
}

function isLocalHost(host: string | null): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function resolveBackupConfig(env: BackupEnv): BackupConfig | null {
  const accountId = env.accountId?.trim() ?? "";
  const accessKeyId = env.accessKeyId?.trim() ?? "";
  const secretAccessKey = env.secretAccessKey?.trim() ?? "";
  const bucket = env.bucket?.trim() ?? "";
  const databaseUrl = (env.directUrl?.trim() || env.databaseUrl?.trim()) ?? "";
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !databaseUrl) {
    return null;
  }

  const forced = env.backupEnabled === "true";
  const production = env.nodeEnv === "production";
  if (!forced && !production) return null;
  if (isLocalHost(databaseHost(databaseUrl)) && !forced) return null;

  return { accountId, accessKeyId, secretAccessKey, bucket, databaseUrl };
}

/**
 * A partir das 20h em Brasília, até o backup do dia concluir.
 * Se o envio falhar, as tentativas seguem até a meia-noite.
 */
export function shouldRunScheduledDailyBackup(
  now: Date,
  lastCompletedDay: string | null,
): boolean {
  if (lastCompletedDay === formatSaoPauloDay(now)) return false;
  return saoPauloParts(now).hour >= DAILY_BACKUP_HOUR;
}

export function isAtOrAfterDailyBackup(now: Date): boolean {
  return saoPauloParts(now).hour >= DAILY_BACKUP_HOUR;
}

export function hasDailyBackupOnDay(keys: string[], now: Date): boolean {
  const day = formatSaoPauloDay(now);
  return keys.some(
    (key) => key.includes(`db_logistica-${day}-`) && key.endsWith("-diario.sql"),
  );
}

export function shouldCatchUpDailyBackup(
  now: Date,
  keys: string[],
  lastCompletedDay: string | null,
): boolean {
  if (lastCompletedDay === formatSaoPauloDay(now)) return false;
  if (!isAtOrAfterDailyBackup(now)) return false;
  return !hasDailyBackupOnDay(keys, now);
}

/** Apaga o que passou de 7 dias e conserva o arquivo mais recente. */
export function keysToDelete(objects: BackupObject[], now: Date): string[] {
  if (objects.length <= 1) return [];
  const sorted = [...objects].sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
  );
  const newestKey = sorted[0]?.key;
  const cutoff = now.getTime() - BACKUP_RETENTION_MS;
  return sorted
    .filter(
      (object) =>
        object.key !== newestKey && object.lastModified.getTime() < cutoff,
    )
    .map((object) => object.key);
}
