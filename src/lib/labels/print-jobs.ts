import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { labelPrintJobs, type LabelPrintJob } from "@/db/schema";

export type LabelPrintJobPublic = {
  id: string;
  measurementId: string;
  itemId: string;
  status: LabelPrintJob["status"];
  error: string | null;
  createdAt: string;
  claimedAt: string | null;
  completedAt: string | null;
};

function toPublic(job: LabelPrintJob): LabelPrintJobPublic {
  return {
    id: job.id,
    measurementId: job.measurementId,
    itemId: job.itemId,
    status: job.status,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    claimedAt: job.claimedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

export async function createLabelPrintJob(input: {
  measurementId: string;
  itemId: string;
  raw: string;
  createdById: string | null;
}): Promise<LabelPrintJobPublic> {
  const db = getDb();
  const [row] = await db
    .insert(labelPrintJobs)
    .values({
      measurementId: input.measurementId,
      itemId: input.itemId,
      raw: input.raw,
      createdById: input.createdById,
      status: "pending",
    })
    .returning();
  return toPublic(row);
}

export async function getLabelPrintJob(
  id: string,
): Promise<LabelPrintJobPublic | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(labelPrintJobs)
    .where(eq(labelPrintJobs.id, id))
    .limit(1);
  return row ? toPublic(row) : null;
}

export type ClaimedLabelPrintJob = {
  id: string;
  raw: string;
};

/**
 * Claim the oldest pending job (select + conditional update).
 */
export async function claimNextLabelPrintJobSafe(): Promise<ClaimedLabelPrintJob | null> {
  const db = getDb();

  const [pending] = await db
    .select({ id: labelPrintJobs.id, raw: labelPrintJobs.raw })
    .from(labelPrintJobs)
    .where(eq(labelPrintJobs.status, "pending"))
    .orderBy(asc(labelPrintJobs.createdAt))
    .limit(1);

  if (!pending) return null;

  const [updated] = await db
    .update(labelPrintJobs)
    .set({ status: "printing", claimedAt: new Date() })
    .where(
      and(
        eq(labelPrintJobs.id, pending.id),
        eq(labelPrintJobs.status, "pending"),
      ),
    )
    .returning({ id: labelPrintJobs.id, raw: labelPrintJobs.raw });

  return updated ?? null;
}

export async function completeLabelPrintJob(
  id: string,
  result: { ok: true } | { ok: false; error: string },
): Promise<LabelPrintJobPublic | null> {
  const db = getDb();
  const [row] = await db
    .update(labelPrintJobs)
    .set(
      result.ok
        ? {
            status: "done",
            error: null,
            completedAt: new Date(),
          }
        : {
            status: "failed",
            error: result.error.slice(0, 2000),
            completedAt: new Date(),
          },
    )
    .where(
      and(eq(labelPrintJobs.id, id), eq(labelPrintJobs.status, "printing")),
    )
    .returning();
  return row ? toPublic(row) : null;
}
