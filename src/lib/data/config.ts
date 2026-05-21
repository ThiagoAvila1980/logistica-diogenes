import { isSupabaseConfigured } from "@/db/env";

/** Modo demo em memória — apenas quando USE_MOCK_DATA=true ou Supabase não configurado. */
export function useMockData(): boolean {
  return process.env.USE_MOCK_DATA === "true" || !isSupabaseConfigured();
}
