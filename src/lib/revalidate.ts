import { revalidatePath } from "next/cache";

/**
 * Revalida todas as rotas afetadas por uma mudança de status de OS.
 * Centraliza as chamadas para não esquecer nenhuma rota em nenhuma action.
 */
export function revalidateOSRoutes(osId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/field");
  revalidatePath("/production");
  revalidatePath("/logistics");
  revalidatePath("/installation");
  if (osId) {
    revalidatePath(`/field/${osId}`);
    revalidatePath(`/production/${osId}`);
    revalidatePath(`/logistics/${osId}`);
    revalidatePath(`/installation/${osId}`);
  }
}
