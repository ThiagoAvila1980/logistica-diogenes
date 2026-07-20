/**
 * Orquestra impressão de etiqueta via fila no servidor (HTTPS).
 * O agente Windows busca o job e imprime na USB.
 */

export type PrintLabelResult =
  | { ok: true; channel: "queue"; jobId: string; printer?: string }
  | {
      ok: false;
      code: "enqueue_failed" | "print_failed" | "timeout" | "agent_offline";
      message: string;
      jobId?: string;
    };

export type LabelPrintJobStatus =
  | "pending"
  | "printing"
  | "done"
  | "failed";

export async function fetchLabelRaw(
  osId: string,
  itemId: string,
  options?: { preview?: boolean },
): Promise<
  | { ok: true; raw: string; previewDataUrl: string | null }
  | { ok: false; message: string }
> {
  const params = new URLSearchParams({ itemId });
  if (options?.preview) params.set("preview", "1");
  const res = await fetch(
    `/api/labels/${encodeURIComponent(osId)}?${params.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false,
      message: body?.error ?? `Erro ao gerar etiqueta (${res.status})`,
    };
  }
  const data = (await res.json()) as {
    raw?: string;
    previewDataUrl?: string | null;
  };
  if (!data.raw) {
    return { ok: false, message: "Resposta da API sem dados de impressão." };
  }
  return {
    ok: true,
    raw: data.raw,
    previewDataUrl: data.previewDataUrl ?? null,
  };
}

async function enqueueLabelPrintJob(
  osId: string,
  itemId: string,
): Promise<
  | { ok: true; jobId: string }
  | { ok: false; message: string }
> {
  const res = await fetch("/api/label-print-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ osId, itemId }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as {
    error?: string;
    job?: { id?: string };
  } | null;
  if (!res.ok) {
    return {
      ok: false,
      message: body?.error ?? `Falha ao enfileirar (${res.status})`,
    };
  }
  const jobId = body?.job?.id;
  if (!jobId) {
    return { ok: false, message: "Resposta sem id do job." };
  }
  return { ok: true, jobId };
}

async function fetchJobStatus(jobId: string): Promise<{
  status: LabelPrintJobStatus;
  error: string | null;
} | null> {
  const res = await fetch(`/api/label-print-jobs/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    job?: { status?: LabelPrintJobStatus; error?: string | null };
  };
  if (!body.job?.status) return null;
  return { status: body.job.status, error: body.job.error ?? null };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enfileira a etiqueta e espera o agente imprimir (até timeoutMs).
 */
export async function fetchAndPrintVaoLabel(
  osId: string,
  itemId: string,
  options?: { timeoutMs?: number; pollMs?: number },
): Promise<PrintLabelResult> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const pollMs = options?.pollMs ?? 1_200;

  const enqueued = await enqueueLabelPrintJob(osId, itemId);
  if (!enqueued.ok) {
    return {
      ok: false,
      code: "enqueue_failed",
      message: enqueued.message,
    };
  }

  const { jobId } = enqueued;
  const deadline = Date.now() + timeoutMs;
  let sawPrinting = false;

  while (Date.now() < deadline) {
    const job = await fetchJobStatus(jobId);
    if (!job) {
      await sleep(pollMs);
      continue;
    }
    if (job.status === "printing") sawPrinting = true;
    if (job.status === "done") {
      return { ok: true, channel: "queue", jobId };
    }
    if (job.status === "failed") {
      return {
        ok: false,
        code: "print_failed",
        message: job.error || "Falha na impressão no PC da impressora.",
        jobId,
      };
    }
    await sleep(pollMs);
  }

  return {
    ok: false,
    code: sawPrinting ? "timeout" : "agent_offline",
    message: sawPrinting
      ? "A impressora demorou demais. Confira o PC e a fila do Windows."
      : "Nenhum PC da impressora respondeu. Confira se o impressao.bat está rodando no computador da Thermal LABEL.",
    jobId,
  };
}
