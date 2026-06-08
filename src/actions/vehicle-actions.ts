"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { useMockData } from "@/lib/data/config";
import { vehicleMockStore } from "@/lib/data/admin-mock-store";
import { listVehicles } from "@/lib/data/vehicles";

const vehicleSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(2, "Descrição obrigatória"),
  plate: z.string().min(7, "Placa inválida").max(20),
  active: z.coerce.boolean().optional(),
});

export type AdminActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function getVehiclesForAdmin() {
  await requireRole(["admin"]);
  return listVehicles();
}

export async function saveVehicle(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const rawActive = formData.get("active");
  const parsed = vehicleSchema.safeParse({
    id: formData.get("id") || undefined,
    description: formData.get("description"),
    plate: formData.get("plate"),
    // undefined quando o campo não existe no form (criação) → DB usa default true
    active:
      rawActive === null
        ? undefined
        : rawActive === "on" || rawActive === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.flatten().fieldErrors.description?.[0] ??
        parsed.error.flatten().fieldErrors.plate?.[0] ??
        "Dados inválidos",
    };
  }

  const { id, description, plate, active } = parsed.data;

  try {
    if (useMockData()) {
      if (id) {
        vehicleMockStore.update(id, { description, plate, active });
      } else {
        vehicleMockStore.create({ description, plate });
      }
    } else {
      const {
        upsertVehicleDb,
        countVehiclesByPlateDb,
        isVehicleInUseDb,
      } = await import("@/lib/data/vehicles-db");
      const dup = await countVehiclesByPlateDb(plate, id);
      if (dup > 0) {
        return { success: false, message: "Placa já cadastrada" };
      }
      if (id && active === false) {
        const inUse = await isVehicleInUseDb(id);
        if (inUse) {
          return {
            success: false,
            message: "Veículo em uso — não pode ser desativado",
          };
        }
      }
      await upsertVehicleDb({ id, description, plate, active });
    }

    revalidatePath("/admin/vehicles");
    revalidatePath("/logistics");
    return {
      success: true,
      message: id ? "Veículo atualizado" : "Veículo cadastrado",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao salvar veículo",
    };
  }
}

export async function deleteVehicle(vehicleId: string): Promise<AdminActionResult> {
  try {
    await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  try {
    if (useMockData()) {
      vehicleMockStore.delete(vehicleId);
    } else {
      const { deleteVehicleDb, isVehicleInUseDb } = await import(
        "@/lib/data/vehicles-db"
      );
      if (await isVehicleInUseDb(vehicleId)) {
        return { success: false, message: "Veículo em uso no transporte" };
      }
      await deleteVehicleDb(vehicleId);
    }
    revalidatePath("/admin/vehicles");
    revalidatePath("/logistics");
    return { success: true, message: "Veículo removido" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao remover veículo",
    };
  }
}
