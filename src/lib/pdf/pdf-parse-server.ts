import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

type PDFParseClass = typeof import("pdf-parse").PDFParse;

let pdfParseClass: PDFParseClass | null = null;

function resolvePdfWorkerPath(): string {
  const require = createRequire(import.meta.url);
  const mainPath = require.resolve("pdf-parse");
  return path.join(
    path.dirname(mainPath),
    "..",
    "..",
    "worker",
    "pdf.worker.mjs",
  );
}

async function ensureCanvasPolyfills(): Promise<void> {
  if (typeof globalThis.DOMMatrix !== "undefined") return;

  const canvas = await import("@napi-rs/canvas");
  globalThis.DOMMatrix =
    canvas.DOMMatrix as unknown as typeof globalThis.DOMMatrix;
  globalThis.ImageData =
    canvas.ImageData as unknown as typeof globalThis.ImageData;
  globalThis.Path2D = canvas.Path2D as unknown as typeof globalThis.Path2D;
}

/** Carrega pdf-parse sob demanda com polyfills de canvas para Node/serverless. */
export async function loadPdfParse(): Promise<PDFParseClass> {
  if (pdfParseClass) return pdfParseClass;

  await ensureCanvasPolyfills();

  const { PDFParse } = await import("pdf-parse");
  const workerPath = resolvePdfWorkerPath();

  PDFParse.setWorker(pathToFileURL(workerPath).href);
  pdfParseClass = PDFParse;
  return PDFParse;
}
