"use server";
import { NextResponse } from "next/server";

export async function GET() {
  // Remover após diagnóstico
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "(não definido — usando default)";
  const storagePrimary = process.env.STORAGE_PRIMARY ?? "(não definido)";

  return NextResponse.json({
    hasServiceKey,
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().length ?? 0,
    hasSupabaseUrl,
    bucket,
    storagePrimary,
  });
}
