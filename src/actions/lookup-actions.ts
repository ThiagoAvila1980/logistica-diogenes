"use server";

import {
  listMeasurementLookups,
  type MeasurementLookups,
} from "@/lib/data/lookups";

export async function listMeasurementLookupsAction(): Promise<MeasurementLookups> {
  return listMeasurementLookups();
}
