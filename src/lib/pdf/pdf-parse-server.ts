import path from "path";
import { pathToFileURL } from "url";

type PDFParseClass = typeof import("pdf-parse").PDFParse;

let pdfParseClass: PDFParseClass | null = null;

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
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "worker",
    "pdf.worker.mjs",
  );

  PDFParse.setWorker(pathToFileURL(workerPath).href);
  pdfParseClass = PDFParse;
  return PDFParse;
}
