import "server-only";

import { and, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements, users } from "@/db/schema";
import {
  attachInstallerNames,
  extractAgendaVaos,
  type AgendaVaoItem,
} from "@/lib/installation/agenda";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export async function listInstallationAgendaVaos(options: {
  isoDate: string;
  installerId?: string;
}): Promise<AgendaVaoItem[]> {
  const db = getDb();

  const installerClause = options.installerId
    ? sql`and item->'installationProgress'->>'installerId' = ${options.installerId}`
    : sql``;

  const rows = await db
    .select({
      id: measurements.id,
      number: measurements.number,
      numeroOrcamento: measurements.numeroOrcamento,
      budgetReference: measurements.budgetReference,
      cliente: measurements.cliente,
      endereco: measurements.endereco,
      telefone: measurements.telefone,
      priority: measurements.priority,
      items: measurements.items,
    })
    .from(measurements)
    .where(
      and(
        isNull(measurements.archivedAt),
        sql`exists (
          select 1
          from jsonb_array_elements(coalesce(${measurements.items}, '[]'::jsonb)) as item
          where item->'installationProgress'->>'scheduledInstallationDate' = ${options.isoDate}
            ${installerClause}
        )`,
      ),
    );

  const extracted = extractAgendaVaos(
    rows.map((row) => ({
      ...row,
      items: (row.items as MeasurementLineItem[] | null) ?? null,
    })),
    {
      isoDate: options.isoDate,
      installerId: options.installerId,
    },
  );

  const installerIds = [
    ...new Set(
      extracted
        .map((vao) => vao.installerId)
        .filter((id): id is string => !!id),
    ),
  ];

  const nameRows =
    installerIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, installerIds))
      : [];

  return attachInstallerNames(
    extracted,
    new Map(nameRows.map((row) => [row.id, row.name])),
  );
}
