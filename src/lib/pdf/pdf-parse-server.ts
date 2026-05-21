import path from "path";
import { pathToFileURL } from "url";
import { PDFParse } from "pdf-parse";

let workerConfigured = false;

/** Configura o worker do pdf.js para rodar em Server Actions / API (Next.js). */
export function ensurePdfParseWorker(): void {
  if (workerConfigured) return;

  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "worker",
    "pdf.worker.mjs",
  );

  PDFParse.setWorker(pathToFileURL(workerPath).href);
  workerConfigured = true;
}

export { PDFParse };
