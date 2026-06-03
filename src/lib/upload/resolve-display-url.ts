import type { FieldMeasurementDraft } from "@/lib/data/field";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStorageConfig } from "./storage/config";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

type SupabaseObjectRef = {
  bucket: string;
  key: string;
};

function parseSupabaseStorageUrl(url: string): SupabaseObjectRef | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes(".supabase.co")) return null;

    const match = parsed.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
    );
    if (!match?.[1] || !match[2]) return null;

    return {
      bucket: decodeURIComponent(match[1]),
      key: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

function buildSupabasePublicUrl(
  projectUrl: string,
  bucket: string,
  key: string,
): string {
  const base = projectUrl.replace(/\/$/, "");
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encodedKey}`;
}

function toLocalUploadPath(key: string): string {
  return `/uploads/${key.replace(/\\/g, "/")}`;
}

/** Extrai a chave relativa (ex.: measurements/osId/drawings/file.webp) de URL persistida. */
export function storageKeyFromPersistedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/uploads/")) {
    return trimmed.replace(/^\/uploads\//, "");
  }
  const supabaseRef = parseSupabaseStorageUrl(trimmed);
  if (supabaseRef) return supabaseRef.key;
  if (
    trimmed.startsWith("measurements/") ||
    trimmed.startsWith("catalog/")
  ) {
    return trimmed;
  }
  return null;
}

/** Resolve URL persistida para exibição no browser (signed URL quando necessário). */
export async function resolveUploadDisplayUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/uploads/")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("uploads/")) {
    return `/${trimmed}`;
  }

  const config = getStorageConfig();
  const supabaseRef = parseSupabaseStorageUrl(trimmed);

  if (
    !supabaseRef &&
    config.supabase &&
    (trimmed.startsWith("measurements/") || trimmed.startsWith("catalog/"))
  ) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(config.supabase.bucket)
        .createSignedUrl(trimmed, SIGNED_URL_TTL_SECONDS);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn("[resolveUploadDisplayUrl] signed URL failed:", err);
    }
  }

  if (supabaseRef && config.supabase) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(supabaseRef.bucket)
        .createSignedUrl(supabaseRef.key, SIGNED_URL_TTL_SECONDS);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
      if (error) {
        console.warn(
          "[resolveUploadDisplayUrl] signed URL failed:",
          supabaseRef.bucket,
          supabaseRef.key,
          error.message,
        );
      }
    } catch (err) {
      console.warn("[resolveUploadDisplayUrl] signed URL failed:", err);
    }
  }

  const storageKey = storageKeyFromPersistedUrl(trimmed);
  if (storageKey && !config.supabase) {
    return toLocalUploadPath(storageKey);
  }

  return trimmed;
}

/** Converte signed URL de volta ao formato persistido (public/local). */
export function normalizePersistedUploadUrl(url: string): string {
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/uploads/")
  ) {
    return trimmed;
  }

  const config = getStorageConfig();
  const supabaseRef = parseSupabaseStorageUrl(trimmed);

  if (supabaseRef && config.supabase) {
    return buildSupabasePublicUrl(
      config.supabase.url,
      supabaseRef.bucket,
      supabaseRef.key,
    );
  }

  return trimmed;
}

export async function resolveFieldMeasurementDraftUrls(
  draft: FieldMeasurementDraft,
): Promise<FieldMeasurementDraft> {
  const photos = await Promise.all(
    (draft.photos ?? []).map((url) => resolveUploadDisplayUrl(url)),
  );

  const items = draft.items?.length
    ? await Promise.all(
        draft.items.map(async (item) => ({
          ...item,
          drawingUrl: item.drawingUrl
            ? await resolveUploadDisplayUrl(item.drawingUrl)
            : item.drawingUrl,
        })),
      )
    : draft.items;

  return {
    ...draft,
    photos,
    items,
  };
}
