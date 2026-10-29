import { describe, expect, it } from "vitest";
import {
  backupObjectKey,
  hasDailyBackupOnDay,
  keysToDelete,
  resolveBackupConfig,
  shouldCatchUpDailyBackup,
  shouldRunScheduledDailyBackup,
} from "./policy";

const remoteEnv = {
  nodeEnv: "production",
  accountId: "account",
  accessKeyId: "key",
  secretAccessKey: "secret",
  bucket: "diogenes",
  directUrl: "postgresql://postgres:senha@10.0.0.8:5432/db_logistica",
};

describe("backup do banco", () => {
  it("nomeia o arquivo no horário de Brasília", () => {
    const now = new Date("2026-10-29T23:00:00.000Z");
    expect(backupObjectKey("diario", now)).toBe(
      "backups/db_logistica-20261029-200000-diario.sql",
    );
    expect(backupObjectKey("corte", now)).toBe(
      "backups/db_logistica-20261029-200000-corte.sql",
    );
  });

  it("dispara o diário a partir das 20h e só uma vez por dia", () => {
    const atEight = new Date("2026-10-29T23:10:00.000Z");
    const before = new Date("2026-10-29T22:59:00.000Z");
    const later = new Date("2026-10-30T00:30:00.000Z");
    expect(shouldRunScheduledDailyBackup(atEight, null)).toBe(true);
    expect(shouldRunScheduledDailyBackup(later, null)).toBe(true);
    expect(shouldRunScheduledDailyBackup(before, null)).toBe(false);
    expect(shouldRunScheduledDailyBackup(atEight, "20261029")).toBe(false);
  });

  it("recupera o diário se o processo subiu depois das 20h e o arquivo do dia não existe", () => {
    const later = new Date("2026-10-30T00:30:00.000Z");
    expect(shouldCatchUpDailyBackup(later, [], null)).toBe(true);
    expect(
      shouldCatchUpDailyBackup(
        later,
        ["backups/db_logistica-20261029-200000-diario.sql"],
        null,
      ),
    ).toBe(false);
    expect(hasDailyBackupOnDay(["backups/db_logistica-20261029-163000-corte.sql"], later)).toBe(
      false,
    );
  });

  it("não liga backup de banco local nem fora de produção", () => {
    expect(resolveBackupConfig(remoteEnv)?.bucket).toBe("diogenes");
    expect(resolveBackupConfig({ ...remoteEnv, nodeEnv: "development" })).toBeNull();
    expect(
      resolveBackupConfig({
        ...remoteEnv,
        directUrl: "postgresql://postgres:senha@localhost:5432/db_logistica",
      }),
    ).toBeNull();
    expect(
      resolveBackupConfig({
        ...remoteEnv,
        nodeEnv: "development",
        backupEnabled: "true",
        directUrl: "postgresql://postgres:senha@localhost:5432/db_logistica",
      })?.databaseUrl,
    ).toContain("localhost");
  });

  it("guarda uma semana e nunca apaga o backup mais novo", () => {
    const now = new Date("2026-10-29T23:00:00.000Z");
    const day = 24 * 60 * 60 * 1000;
    const keys = keysToDelete(
      [
        { key: "antigo.sql", lastModified: new Date(now.getTime() - 8 * day) },
        { key: "semana.sql", lastModified: new Date(now.getTime() - 3 * day) },
        { key: "mais-antigo.sql", lastModified: new Date(now.getTime() - 30 * day) },
      ],
      now,
    );
    expect(keys).toEqual(["antigo.sql", "mais-antigo.sql"]);
    expect(
      keysToDelete(
        [{ key: "unico.sql", lastModified: new Date(now.getTime() - 30 * day) }],
        now,
      ),
    ).toEqual([]);
  });
});
