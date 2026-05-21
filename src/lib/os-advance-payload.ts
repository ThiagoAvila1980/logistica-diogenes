import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";

export type OSAdvanceFormData = Record<string, unknown>;

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Monta payload validável a partir do estado do formulário dinâmico */
export function buildAdvancePayload(
  nextStatus: AdvanceTargetStatus,
  formData: OSAdvanceFormData,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (formData.notes) {
    payload.notes = formData.notes;
  }

  if (formData.biometricConfirmation) {
    payload.biometricConfirmation = formData.biometricConfirmation;
  }

  switch (nextStatus) {
    case "medicao_final":
      payload.dimensions = safeJsonParse(formData.dimensions, {});
      if (Array.isArray(formData.measurementPhotos)) {
        payload.photos = formData.measurementPhotos as string[];
      } else if (formData.photos) {
        payload.photos = safeJsonParse<string[]>(formData.photos, []);
      }
      break;

    case "cortes":
    case "embalagem":
    case "acessorios_plano":
      payload.cuts = safeJsonParse(formData.cuts, []);
      payload.accessories = safeJsonParse(formData.accessories, {});
      payload.packaging = {
        structuralProfile: !!formData.structuralProfile,
        totalProfiles: !!formData.totalProfiles,
        accessories: !!formData.packagingAccessories,
        glass: !!formData.glass,
      };
      break;

    case "transporte_perfil":
      if (formData.vehicleId) {
        payload.vehicleId = formData.vehicleId;
      }
      break;

    case "transporte_estrutural":
    case "transporte_perfis_total":
    case "transporte_acessorios":
    case "transporte_levar_vidro":
      payload.itemsChecked = {
        perfil: !!formData.perfil,
        estrutural: !!formData.estrutural,
        perfisTotal: !!formData.perfisTotal,
        accessories: !!formData.accessories,
        glass: !!formData.glass,
      };
      if (formData.vehicleId) {
        payload.vehicleId = formData.vehicleId;
      }
      break;

    case "instalacao_estrutural":
    case "instalacao_vidros":
    case "concluido":
      if (
        Array.isArray(formData.installPhotosBefore) ||
        Array.isArray(formData.installPhotosAfter)
      ) {
        payload.photos = {
          before: (formData.installPhotosBefore as string[]) ?? [],
          after: (formData.installPhotosAfter as string[]) ?? [],
        };
      } else if (formData.photos) {
        payload.photos = safeJsonParse(formData.photos, {
          before: [],
          after: [],
        });
      }
      break;

    default:
      break;
  }

  return payload;
}
