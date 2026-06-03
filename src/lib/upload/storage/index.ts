import { randomUUID } from "crypto";
import { getStorageConfig } from "./config";
import { createLocalStorageProvider } from "./local";
import { createR2StorageProvider } from "./r2";
import { isStorageQuotaError } from "./quota";
import { createSupabaseStorageProvider } from "./supabase";
import type { StorageProvider } from "./types";
import { isPersistedUploadUrl } from "./url-utils";

function buildProvider(name: "local" | "supabase" | "r2"): StorageProvider {
  const config = getStorageConfig();
  switch (name) {
    case "supabase":
      if (!config.hasSupabase) {
        return createLocalStorageProvider();
      }
      return createSupabaseStorageProvider(config.supabase!.bucket);
    case "r2":
      if (!config.hasR2 || !config.r2) {
        throw new Error("Cloudflare R2 não configurado");
      }
      return createR2StorageProvider(config.r2);
    default:
      return createLocalStorageProvider();
  }
}

function getProviders(): { primary: StorageProvider; fallback: StorageProvider | null } {
  const config = getStorageConfig();
  const primary = buildProvider(config.primary);
  const fallback =
    config.fallback && config.fallback !== config.primary
      ? buildProvider(config.fallback)
      : null;
  return { primary, fallback };
}

export function buildStorageKey(
  scope: string,
  osPath: string,
  extension: string,
): string {
  const filename = `${randomUUID()}.${extension}`;
  return `${scope}/${osPath}/${filename}`.replace(/\\/g, "/");
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const { primary, fallback } = getProviders();

  try {
    return await primary.putObject(key, body, contentType);
  } catch (err) {
    if (fallback && isStorageQuotaError(err)) {
      console.warn(
        `[storage] cota no ${primary.name}, usando fallback ${fallback.name}:`,
        err instanceof Error ? err.message : err,
      );
      return fallback.putObject(key, body, contentType);
    }
    throw err;
  }
}

export async function deleteObject(url: string): Promise<void> {
  if (!isPersistedUploadUrl(url)) return;

  const config = getStorageConfig();
  const providers: StorageProvider[] = [buildProvider(config.primary)];
  if (config.fallback) {
    providers.push(buildProvider(config.fallback));
  }
  if (config.primary !== "local") {
    providers.push(createLocalStorageProvider());
  }

  for (const provider of providers) {
    await provider.deleteObject(url);
  }
}

export { isPersistedUploadUrl } from "./url-utils";
export { getStorageConfig };
