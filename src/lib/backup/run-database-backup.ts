import "server-only";

import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";
import {
  BACKUP_KEY_PREFIX,
  backupObjectKey,
  keysToDelete,
  pgDumpTarget,
  resolveBackupConfig,
  type BackupConfig,
  type BackupEnv,
  type BackupKind,
  type BackupObject,
} from "./policy";

let tail: Promise<void> = Promise.resolve();
let warnedDisabled = false;

function readBackupEnv(): BackupEnv {
  return {
    nodeEnv: process.env.NODE_ENV,
    backupEnabled: process.env.BACKUP_ENABLED,
    accountId: process.env.BACKUP_R2_ACCOUNT_ID,
    accessKeyId: process.env.BACKUP_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKUP_R2_SECRET_ACCESS_KEY,
    bucket: process.env.BACKUP_R2_BUCKET,
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  };
}

function redact(text: string, databaseUrl: string): string {
  return text
    .split(databaseUrl)
    .join("[database]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[database]");
}

function createClient(config: BackupConfig): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function dumpDatabase(databaseUrl: string, filePath: string): Promise<void> {
  const target = pgDumpTarget(databaseUrl);
  if (!target) {
    return Promise.reject(new Error("URL do banco sem host ou nome do database."));
  }

  return new Promise((resolve, reject) => {
    const out = createWriteStream(filePath);
    const child = spawn(
      "pg_dump",
      ["--format=plain", "--no-owner", "--no-privileges", ...target.args],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, PGPASSWORD: target.password },
      },
    );
    let stderr = "";
    let settled = false;
    let exitCode: number | null = null;
    let streamDone = false;

    const settle = () => {
      if (settled || exitCode === null || !streamDone) return;
      settled = true;
      if (exitCode === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          redact(stderr.trim(), databaseUrl) || `pg_dump saiu com código ${exitCode}`,
        ),
      );
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      out.destroy();
      reject(error);
    };

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
      fail(
        new Error(
          missing
            ? "pg_dump não está instalado no servidor."
            : redact(error.message, databaseUrl),
        ),
      );
    });
    child.stdout.pipe(out);
    child.on("close", (code) => {
      exitCode = code ?? 1;
      settle();
    });
    out.on("error", (error) => fail(new Error(redact(error.message, databaseUrl))));
    out.on("finish", () => {
      streamDone = true;
      settle();
    });
  });
}

async function listBackupObjects(
  client: S3Client,
  bucket: string,
): Promise<BackupObject[]> {
  const objects: BackupObject[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: BACKUP_KEY_PREFIX,
        ContinuationToken: token,
      }),
    );
    for (const item of page.Contents ?? []) {
      if (!item.Key || !item.LastModified) continue;
      objects.push({ key: item.Key, lastModified: item.LastModified });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

async function pruneOldBackups(client: S3Client, config: BackupConfig): Promise<void> {
  const objects = await listBackupObjects(client, config.bucket);
  const stale = keysToDelete(objects, new Date());
  for (const key of stale) {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    logger.info("Backup antigo removido", { key });
  }
}

async function executeDatabaseBackup(
  config: BackupConfig,
  kind: BackupKind,
): Promise<boolean> {
  const key = backupObjectKey(kind, new Date());
  const dir = await mkdtemp(join(tmpdir(), "db-backup-"));
  const filePath = join(dir, "dump.sql");
  const client = createClient(config);
  try {
    await dumpDatabase(config.databaseUrl, filePath);
    const size = (await stat(filePath)).size;
    if (size === 0) {
      throw new Error("pg_dump gerou um arquivo vazio.");
    }
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: "application/sql",
        ContentLength: size,
      }),
    );
    logger.info("Backup do banco enviado", { key, bytes: size, kind });
    try {
      await pruneOldBackups(client, config);
    } catch (error) {
      logger.warn("Falha ao apagar backups com mais de 7 dias", { error });
    }
    return true;
  } catch (error) {
    logger.error("Falha no backup do banco", { kind, error });
    return false;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function requestDatabaseBackup(kind: BackupKind): Promise<boolean> {
  const config = resolveBackupConfig(readBackupEnv());
  if (!config) {
    if (process.env.NODE_ENV === "production" && !warnedDisabled) {
      warnedDisabled = true;
      logger.warn(
        "Backup do banco desligado. Confira BACKUP_R2_* no ambiente de produção.",
      );
    }
    return Promise.resolve(false);
  }

  const job = tail.then(() => executeDatabaseBackup(config, kind));
  tail = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

export async function listBackupKeys(): Promise<string[]> {
  const config = resolveBackupConfig(readBackupEnv());
  if (!config) return [];
  const objects = await listBackupObjects(createClient(config), config.bucket);
  return objects.map((object) => object.key);
}
