import "server-only";

import { logger } from "@/lib/logger";
import {
  formatSaoPauloDay,
  hasDailyBackupOnDay,
  isAtOrAfterDailyBackup,
  resolveBackupConfig,
  shouldCatchUpDailyBackup,
  shouldRunScheduledDailyBackup,
} from "./policy";
import { listBackupKeys, requestDatabaseBackup } from "./run-database-backup";

const globalState = globalThis as typeof globalThis & {
  __dbBackupScheduleStarted?: boolean;
};

let lastCompletedDay: string | null = null;
let inFlight = false;

async function runDailyBackup(now: Date): Promise<void> {
  if (inFlight || lastCompletedDay === formatSaoPauloDay(now)) return;
  inFlight = true;
  try {
    const ok = await requestDatabaseBackup("diario");
    if (ok) lastCompletedDay = formatSaoPauloDay(now);
  } finally {
    inFlight = false;
  }
}

async function catchUpDailyBackup(): Promise<void> {
  const now = new Date();
  if (!isAtOrAfterDailyBackup(now) || lastCompletedDay === formatSaoPauloDay(now)) {
    return;
  }
  let keys: string[] = [];
  try {
    keys = await listBackupKeys();
  } catch (error) {
    logger.warn("Não foi possível listar os backups do dia", { error });
    return;
  }
  if (!shouldCatchUpDailyBackup(now, keys, lastCompletedDay)) {
    if (hasDailyBackupOnDay(keys, now)) lastCompletedDay = formatSaoPauloDay(now);
    return;
  }
  await runDailyBackup(now);
}

function tick(): void {
  const now = new Date();
  if (!shouldRunScheduledDailyBackup(now, lastCompletedDay)) return;
  void runDailyBackup(now);
}

export function startDailyBackupSchedule(): void {
  if (globalState.__dbBackupScheduleStarted) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (
    !resolveBackupConfig({
      nodeEnv: process.env.NODE_ENV,
      backupEnabled: process.env.BACKUP_ENABLED,
      accountId: process.env.BACKUP_R2_ACCOUNT_ID,
      accessKeyId: process.env.BACKUP_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.BACKUP_R2_SECRET_ACCESS_KEY,
      bucket: process.env.BACKUP_R2_BUCKET,
      databaseUrl: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL,
    })
  ) {
    return;
  }

  globalState.__dbBackupScheduleStarted = true;
  void catchUpDailyBackup();
  const timer = setInterval(tick, 30_000);
  timer.unref?.();
  logger.info("Backup diário agendado para 20:00 em America/Sao_Paulo");
}
