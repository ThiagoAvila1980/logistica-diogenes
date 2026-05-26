"use server";

import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { getDb } from "@/db";

/** Gera número único consultando a tabela measurements */
export async function generateMeasurementNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const db = getDb();

  for (let attempt = 0; attempt < 8; attempt++) {
    const seq = Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, "0");
    const number = `OS-${year}-${seq}`;

    const [existing] = await db
      .select({ id: schema.measurements.id })
      .from(schema.measurements)
      .where(eq(schema.measurements.number, number))
      .limit(1);

    if (!existing) return number;
  }

  return `OS-${year}-${Date.now().toString().slice(-5)}`;
}

/** @deprecated Use generateMeasurementNumber — alias mantido durante migração */
export const generateServiceOrderNumber = generateMeasurementNumber;
