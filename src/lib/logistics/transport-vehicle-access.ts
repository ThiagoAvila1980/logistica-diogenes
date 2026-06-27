import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export function collectVehicleIdsFromMeasurementItems(
  items: MeasurementLineItem[] | null | undefined,
): string[] {
  const ids = new Set<string>();
  for (const item of items ?? []) {
    const vehicleId = item.transportProgress?.vehicleId;
    if (vehicleId) ids.add(vehicleId);
  }
  return [...ids];
}

export function mergeVehicleIds(
  ...sources: Array<readonly (string | null | undefined)[]>
): string[] {
  const ids = new Set<string>();
  for (const source of sources) {
    for (const id of source) {
      if (id) ids.add(id);
    }
  }
  return [...ids];
}
