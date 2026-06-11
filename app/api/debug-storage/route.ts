"use server";
import { NextResponse } from "next/server";
import { resolveUploadDisplayUrl } from "@/lib/upload/resolve-display-url";
import { getStorageConfig } from "@/lib/upload/storage/config";
import { getDb } from "@/lib/db";
import { measurements } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const config = getStorageConfig();

  // Buscar uma URL real do banco
  let storedUrl: string | null = null;
  let resolvedUrl: string | null = null;
  let resolveError: string | null = null;

  try {
    const db = getDb();
    const rows = await db.execute(sql`
      SELECT elem as url
      FROM measurements, jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(items) = 'array'
          THEN (
            SELECT jsonb_agg(photo)
            FROM jsonb_array_elements(items) AS item,
                 jsonb_array_elements_text(item->'photos') AS photo
            WHERE item->'photos' IS NOT NULL
          )
          ELSE '[]'::jsonb
        END
      ) AS elem
      WHERE elem IS NOT NULL
      LIMIT 1
    `);
    storedUrl = ((rows as unknown as { url: string }[])[0]?.url) ?? null;
  } catch (e) {
    storedUrl = `ERRO ao buscar do banco: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (storedUrl && !storedUrl.startsWith("ERRO")) {
    try {
      resolvedUrl = await resolveUploadDisplayUrl(storedUrl);
    } catch (e) {
      resolveError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().length ?? 0,
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "(default: imagens_diogenes)",
    storagePrimary: process.env.STORAGE_PRIMARY ?? "(não definido)",
    configHasSupabase: config.hasSupabase,
    configPrimary: config.primary,
    storedUrl: storedUrl?.slice(0, 100),
    resolvedUrl: resolvedUrl?.slice(0, 120),
    resolvedUrlType: resolvedUrl
      ? resolvedUrl.includes("/object/sign/")
        ? "signed ✓"
        : resolvedUrl.includes("/object/public/")
          ? "public (não resolveu) ✗"
          : resolvedUrl.startsWith("/uploads/")
            ? "local /uploads ✗"
            : "outro"
      : null,
    resolveError,
  });
}
